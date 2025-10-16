document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Filter elements
  const categoryFilter = document.getElementById("category-filter");
  const sortFilter = document.getElementById("sort-filter");
  const searchFilter = document.getElementById("search-filter");
  
  // Store all activities for filtering
  let allActivities = {};

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      allActivities = await response.json();
      
      // Initial render with all activities
      renderActivities(allActivities);
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }
  
  // Function to filter and sort activities
  function getFilteredActivities() {
    const categoryValue = categoryFilter.value;
    const sortValue = sortFilter.value;
    const searchValue = searchFilter.value.toLowerCase();
    
    // Filter by category
    let filtered = Object.entries(allActivities).filter(([name, details]) => {
      if (categoryValue && details.category !== categoryValue) {
        return false;
      }
      return true;
    });
    
    // Filter by search text
    if (searchValue) {
      filtered = filtered.filter(([name, details]) => {
        return (
          name.toLowerCase().includes(searchValue) ||
          details.description.toLowerCase().includes(searchValue) ||
          details.schedule.toLowerCase().includes(searchValue)
        );
      });
    }
    
    // Sort activities
    filtered.sort(([nameA, detailsA], [nameB, detailsB]) => {
      if (sortValue === "name") {
        return nameA.localeCompare(nameB);
      } else if (sortValue === "time") {
        // Sort by schedule text
        return detailsA.schedule.localeCompare(detailsB.schedule);
      } else if (sortValue === "availability") {
        // Sort by available spots (descending)
        const spotsA = detailsA.max_participants - detailsA.participants.length;
        const spotsB = detailsB.max_participants - detailsB.participants.length;
        return spotsB - spotsA;
      }
      return 0;
    });
    
    return Object.fromEntries(filtered);
  }
  
  // Function to render activities
  function renderActivities(activities) {
    // Clear loading message and existing content
    activitiesList.innerHTML = "";
    
    // Clear and repopulate activity select dropdown
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    if (Object.keys(activities).length === 0) {
      activitiesList.innerHTML = "<p>No activities match your filters.</p>";
      return;
    }

    // Populate activities list
    Object.entries(activities).forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft =
        details.max_participants - details.participants.length;

      // Create participants HTML with delete icons instead of bullet points
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
            <h5>Participants:</h5>
            <ul class="participants-list">
              ${details.participants
                .map(
                  (email) =>
                    `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                )
                .join("")}
            </ul>
          </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Category:</strong> ${details.category}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);

      // Add option to select dropdown
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }
  
  // Event listeners for filters
  categoryFilter.addEventListener("change", () => {
    const filtered = getFilteredActivities();
    renderActivities(filtered);
  });
  
  sortFilter.addEventListener("change", () => {
    const filtered = getFilteredActivities();
    renderActivities(filtered);
  });
  
  searchFilter.addEventListener("input", () => {
    const filtered = getFilteredActivities();
    renderActivities(filtered);
  });

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        await fetchActivities();
        const filtered = getFilteredActivities();
        renderActivities(filtered);
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        await fetchActivities();
        const filtered = getFilteredActivities();
        renderActivities(filtered);
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
