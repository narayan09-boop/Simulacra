import uuid
import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from stable_baselines3 import PPO

from app.database import get_db
from app.models import EvaluationResult, Checkpoint
from app.schemas import (
    EvaluationRequest, EvaluationResponse, EvaluationEpisodeResult,
    PolicyComparisonRequest, PolicyComparisonResponse, PolicyComparisonResult
)
from app.sim.env import VisualNavigationEnv
from app.rl.base import RandomPolicy, HeuristicPolicy
from app.rl.ppo_trainer import PPOPolicyWrapper
from app.rl.evaluator import evaluate_policy
from app.services.experiment_service import ExperimentService

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])

def _create_env_from_config(config_dict: dict) -> VisualNavigationEnv:
    agent_start = tuple(config_dict["agent_start"].values()) if config_dict.get("agent_start") else None
    goal_pos = tuple(config_dict["goal_pos"].values()) if config_dict.get("goal_pos") else None
    obstacles = [tuple(o.values() if isinstance(o, dict) else o) for o in config_dict.get("obstacles", [])] if config_dict.get("obstacles") else None

    return VisualNavigationEnv(
        width=int(config_dict.get("width", 10)),
        height=int(config_dict.get("height", 10)),
        agent_start=agent_start,
        goal_pos=goal_pos,
        obstacles=obstacles,
        obstacle_density=float(config_dict.get("obstacle_density", 0.15)),
        max_steps=int(config_dict.get("max_steps", 100)),
        goal_reward=float(config_dict.get("goal_reward", 10.0)),
        step_penalty=float(config_dict.get("step_penalty", -0.05)),
        collision_penalty=float(config_dict.get("collision_penalty", -0.5)),
        progress_reward_weight=float(config_dict.get("progress_reward_weight", 1.0))
    )

@router.post("/run", response_model=EvaluationResponse)
def run_evaluation(req: EvaluationRequest, db: Session = Depends(get_db)):
    env_cfg = req.env_config.model_dump() if req.env_config else {}
    env = _create_env_from_config(env_cfg)

    policy = None
    exp_id = None

    if req.policy_type.lower() == "random":
        policy = RandomPolicy(seed=req.seed or 123)
    elif req.policy_type.lower() == "heuristic":
        policy = HeuristicPolicy(env=env)
    elif req.policy_type.lower() == "ppo":
        if not req.checkpoint_id:
            raise HTTPException(status_code=400, detail="checkpoint_id is required for PPO evaluation")
        ckpt = db.query(Checkpoint).filter(Checkpoint.id == req.checkpoint_id).first()
        if not ckpt or not Path(ckpt.file_path).exists():
            raise HTTPException(status_code=404, detail="Checkpoint file not found on server")
        model = PPO.load(ckpt.file_path)
        policy = PPOPolicyWrapper(model)
        exp_id = ckpt.experiment_id
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported policy type: {req.policy_type}")

    eval_results = evaluate_policy(
        policy=policy,
        env=env,
        num_episodes=req.num_episodes,
        base_seed=req.seed or 1000
    )

    eval_id = str(uuid.uuid4())
    # Save result to DB
    db_eval = EvaluationResult(
        id=eval_id,
        experiment_id=exp_id,
        checkpoint_id=req.checkpoint_id,
        policy_type=req.policy_type.lower(),
        num_episodes=req.num_episodes,
        success_rate=eval_results["success_rate"],
        mean_return=eval_results["mean_return"],
        std_return=eval_results["std_return"],
        mean_length=eval_results["mean_length"],
        trajectories=eval_results["episodes"],
        created_at=datetime.datetime.utcnow()
    )
    db.add(db_eval)
    db.commit()

    return EvaluationResponse(
        id=eval_id,
        experiment_id=exp_id,
        checkpoint_id=req.checkpoint_id,
        policy_type=req.policy_type.lower(),
        num_episodes=req.num_episodes,
        success_rate=eval_results["success_rate"],
        mean_return=eval_results["mean_return"],
        std_return=eval_results["std_return"],
        mean_length=eval_results["mean_length"],
        episodes=[EvaluationEpisodeResult(**ep) for ep in eval_results["episodes"]],
        created_at=db_eval.created_at
    )

@router.post("/compare", response_model=PolicyComparisonResponse)
def compare_policies(req: PolicyComparisonRequest, db: Session = Depends(get_db)):
    """
    Evaluates multiple policies (e.g. PPO vs Random vs Heuristic) on the EXACT same seeds
    for statistically valid, reproducible comparison.
    """
    env_cfg = req.env_config.model_dump() if req.env_config else {}
    env = _create_env_from_config(env_cfg)
    
    results = []
    
    for p_name in req.policies:
        p_type = p_name.lower().strip()
        policy = None
        
        if p_type == "random":
            policy = RandomPolicy(seed=req.seed)
            name_label = "Random Baseline"
        elif p_type == "heuristic":
            policy = HeuristicPolicy(env=env)
            name_label = "Heuristic (A*)"
        elif p_type == "ppo":
            name_label = "PPO Learned Policy"
            if req.checkpoint_id:
                ckpt = db.query(Checkpoint).filter(Checkpoint.id == req.checkpoint_id).first()
                if ckpt and Path(ckpt.file_path).exists():
                    model = PPO.load(ckpt.file_path)
                    policy = PPOPolicyWrapper(model)
            elif req.experiment_id:
                # Find latest checkpoint
                ckpt = db.query(Checkpoint).filter(Checkpoint.experiment_id == req.experiment_id).order_by(Checkpoint.timestep.desc()).first()
                if ckpt and Path(ckpt.file_path).exists():
                    model = PPO.load(ckpt.file_path)
                    policy = PPOPolicyWrapper(model)
                    
            if not policy:
                # If no PPO checkpoint found, return placeholder or skip
                continue
        else:
            continue

        eval_data = evaluate_policy(
            policy=policy,
            env=env,
            num_episodes=req.num_episodes,
            base_seed=req.seed
        )

        sample_traj = eval_data["episodes"][0]["trajectory"] if eval_data["episodes"] else []
        results.append(PolicyComparisonResult(
            policy_name=name_label,
            success_rate=eval_data["success_rate"],
            mean_return=eval_data["mean_return"],
            std_return=eval_data["std_return"],
            mean_length=eval_data["mean_length"],
            sample_trajectory=sample_traj
        ))

    return PolicyComparisonResponse(
        num_episodes=req.num_episodes,
        seed=req.seed,
        results=results
    )
