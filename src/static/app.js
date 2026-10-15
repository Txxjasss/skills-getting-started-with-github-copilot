document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  let messageTimeout;

  // Function to fetch activities from API
  async function fetchActivities() {
    const response = await fetch("/activities", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load activities");
    }

    const activities = await response.json();

    // Clear loading message
    const selectedActivity = activitySelect.value;
    activitiesList.innerHTML = "";
    activitySelect.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());

    // Populate activities list
    Object.entries(activities).forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
      `;

      const participantsSection = document.createElement("div");
      participantsSection.className = "participants";

      const participantsHeading = document.createElement("h5");
      participantsHeading.textContent = "Participants";
      participantsSection.appendChild(participantsHeading);

      if (details.participants.length > 0) {
        const participantsList = document.createElement("ul");
        details.participants.forEach((participant) => {
          const listItem = document.createElement("li");

          const participantEmail = document.createElement("span");
          participantEmail.textContent = participant;
          listItem.appendChild(participantEmail);

          const removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.className = "remove-participant";
          removeButton.setAttribute("aria-label", `Remove ${participant}`);
          removeButton.title = `Remove ${participant}`;
          removeButton.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v7m6-7v7" />
            </svg>
          `;
          removeButton.addEventListener("click", () => unregisterParticipant(name, participant));
          listItem.appendChild(removeButton);

          participantsList.appendChild(listItem);
        });
        participantsSection.appendChild(participantsList);
      } else {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "no-participants";
        emptyMessage.textContent = "No participants yet";
        participantsSection.appendChild(emptyMessage);
      }

      activityCard.appendChild(participantsSection);
      activitiesList.appendChild(activityCard);

      // Add option to select dropdown
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });
    activitySelect.value = selectedActivity;
    return activities;
  }

  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  async function loadActivities() {
    try {
      await fetchActivities();
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function unregisterParticipant(activity, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Unable to unregister participant");
      }

      showMessage(result.message, "success");
      try {
        await fetchActivities();
      } catch (error) {
        showMessage(`${result.message}, but the activity list could not be refreshed.`, "info");
        console.error("Error refreshing activities after unregistering:", error);
      }
    } catch (error) {
      showMessage(error.message || "Failed to unregister participant. Please try again.", "error");
      console.error("Error unregistering participant:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "An error occurred", "error");
        return;
      }

      signupForm.reset();
      showMessage(result.message, "success");
      try {
        await fetchActivities();
      } catch (error) {
        showMessage(`${result.message}, but the activity list could not be refreshed.`, "info");
        console.error("Error refreshing activities after signup:", error);
      }
    } catch (error) {
      showMessage(error.message || "Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  loadActivities();
});
