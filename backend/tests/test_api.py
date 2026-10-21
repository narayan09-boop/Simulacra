import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    init_db()

@pytest.fixture
def client():
    return TestClient(app)

def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "system" in data
    assert "torch_version" in data["system"]

def test_list_environments(client):
    response = client.get("/api/v1/environments")
    assert response.status_code == 200
    envs = response.json()
    assert len(envs) > 0
    assert envs[0]["id"] == "VisualNavigation-v0"

def test_preview_environment(client):
    cfg = {
        "width": 6,
        "height": 6,
        "obstacle_density": 0.1,
        "max_steps": 25
    }
    response = client.post("/api/v1/environments/preview", json=cfg)
    assert response.status_code == 200
    snapshot = response.json()
    assert snapshot["width"] == 6
    assert snapshot["height"] == 6
    assert len(snapshot["agent_pos"]) == 2
    assert len(snapshot["goal_pos"]) == 2

def test_experiment_crud_flow(client):
    # 1. Create experiment
    payload = {
        "name": "Integration Test Exp",
        "description": "Testing experiment flow",
        "algorithm": "PPO",
        "env_id": "VisualNavigation-v0",
        "env_config": {
            "width": 8,
            "height": 8,
            "max_steps": 30
        },
        "hyperparameters": {
            "learning_rate": 0.0005,
            "n_steps": 64
        },
        "seed": 42,
        "total_timesteps": 1000
    }
    create_res = client.post("/api/v1/experiments", json=payload)
    assert create_res.status_code == 200
    exp = create_res.json()
    exp_id = exp["id"]
    assert exp["name"] == "Integration Test Exp"
    assert exp["status"] == "created"

    # 2. Get experiment
    get_res = client.get(f"/api/v1/experiments/{exp_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == exp_id

    # 3. List experiments
    list_res = client.get("/api/v1/experiments")
    assert list_res.status_code == 200
    ids = [e["id"] for e in list_res.json()]
    assert exp_id in ids

    # 4. Check export
    export_res = client.get(f"/api/v1/experiments/{exp_id}/export")
    assert export_res.status_code == 200
    export_data = export_res.json()
    assert "experiment" in export_data
    assert export_data["experiment"]["id"] == exp_id

    # 5. Delete experiment
    del_res = client.delete(f"/api/v1/experiments/{exp_id}")
    assert del_res.status_code == 200

    # Verify deleted
    get_after_del = client.get(f"/api/v1/experiments/{exp_id}")
    assert get_after_del.status_code == 404
