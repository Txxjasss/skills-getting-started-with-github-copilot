from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from app import activities, app  # noqa: E402


@pytest.fixture(autouse=True)
def reset_activities():
    # Arrange
    original = {
        name: {
            "description": details["description"],
            "schedule": details["schedule"],
            "max_participants": details["max_participants"],
            "participants": list(details["participants"]),
        }
        for name, details in activities.items()
    }

    yield

    # Assert cleanup
    activities.clear()
    activities.update(original)


@pytest.fixture
def client():
    # Arrange
    with TestClient(app) as test_client:
        yield test_client


def test_get_activities_returns_activity_catalog(client):
    # Arrange
    expected_activity = "Soccer Club"

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert expected_activity in payload
    assert payload[expected_activity]["max_participants"] == 22
    assert payload[expected_activity]["participants"] == []


def test_signup_adds_participant_for_valid_activity(client):
    # Arrange
    email = "student@example.com"

    # Act
    response = client.post(f"/activities/Soccer Club/signup?email={email}")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {email} for Soccer Club"}
    assert email in activities["Soccer Club"]["participants"]


def test_signup_rejects_duplicate_student(client):
    # Arrange
    email = "michael@mergington.edu"

    # Act
    response = client.post(f"/activities/Chess Club/signup?email={email}")

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Student already registered for this activity"


def test_signup_rejects_unknown_activity(client):
    # Act
    response = client.post("/activities/Unknown Club/signup?email=student@example.com")

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_removes_existing_participant(client):
    # Arrange
    email = "student@example.com"
    client.post(f"/activities/Soccer Club/signup?email={email}")

    # Act
    response = client.delete(f"/activities/Soccer Club/participants?email={email}")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Unregistered {email} from Soccer Club"}
    assert email not in activities["Soccer Club"]["participants"]


def test_unregister_rejects_missing_participant(client):
    # Act
    response = client.delete("/activities/Soccer Club/participants?email=missing@example.com")

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Student is not registered for this activity"
