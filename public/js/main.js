document.addEventListener('DOMContentLoaded', function() {
  // Handle form submissions with AJAX
  const ajaxForms = document.querySelectorAll('.ajax-form');
  ajaxForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const url = this.getAttribute('action');
      const method = this.getAttribute('method') || 'POST';
      
      fetch(url, {
        method: method,
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          showAlert('success', data.message);
          
          // If the form has a reset-after-submit class, reset it
          if (this.classList.contains('reset-after-submit')) {
            this.reset();
          }
          
          // If there's a redirect URL in the response, redirect
          if (data.redirectUrl) {
            setTimeout(() => {
              window.location.href = data.redirectUrl;
            }, 1000);
          } else {
            // Otherwise, reload the page after a short delay
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        } else {
          showAlert('danger', data.error || 'An error occurred.');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        showAlert('danger', 'An error occurred. Please try again.');
      });
    });
  });
  
  // Initialize delete buttons
  const deleteButtons = document.querySelectorAll('.delete-btn');
  deleteButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const id = this.getAttribute('data-id');
      const type = this.getAttribute('data-type');
      const url = this.getAttribute('data-url');
      
      if (confirm(`Are you sure you want to delete this ${type}?`)) {
        fetch(url, {
          method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            showAlert('success', data.message);
            // Remove the item from the DOM
            const row = document.getElementById(`${type}-${id}`);
            if (row) {
              row.remove();
            }
          } else {
            showAlert('danger', data.error || 'An error occurred.');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          showAlert('danger', 'An error occurred. Please try again.');
        });
      }
    });
  });
  
  // Initialize edit buttons for items
  const editButtons = document.querySelectorAll('.edit-btn');
  editButtons.forEach(button => {
    button.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const type = this.getAttribute('data-type');
      
      // Show the edit modal
      const modal = document.getElementById(`edit-${type}-modal`);
      if (!modal) return;
      
      const modalInstance = new bootstrap.Modal(modal);
      
      // Populate form fields
      Object.keys(this.dataset).forEach(key => {
        if (key !== 'id' && key !== 'type') {
          const field = modal.querySelector(`[name="${key}"]`);
          if (field) {
            field.value = this.dataset[key];
          }
        }
      });
      
      // Set the form action to the correct endpoint
      const form = modal.querySelector('form');
      form.setAttribute('action', `/${type}s/update/${id}`);
      
      modalInstance.show();
    });
  });
  
  // Function to show bootstrap alerts
  function showAlert(type, message) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.role = 'alert';
    alertElement.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alertElement);
    
    // Automatically remove the alert after 5 seconds
    setTimeout(() => {
      alertElement.remove();
    }, 5000);
  }
}); 