// Wait for the DOM content to be fully loaded
document.addEventListener("DOMContentLoaded", function() {
    // Find the parent element with the class 'meroxio-sticky-mobile-menu-slider-free'
    var parentElement = document.querySelector(".m-sticky-menu meroxio-sticky-mobile-menu-pro, .company_name");
    
    // Check if the parent element exists
    if (parentElement) {
        // Create a new anchor element
        var poweredByLink = document.createElement("a");
        poweredByLink.textContent = "Powered By MeroxIO";
        poweredByLink.href = "https://apps.shopify.com/meroxio-sticky-mobile-menu-bar"; // Set the href attribute
        poweredByLink.style.textDecoration = "none"; // Apply the CSS property
        poweredByLink.style.display = "block"; // Apply the CSS property
        poweredByLink.style.setProperty("display", "block", "important");
        
        // Append the anchor element to the parent element
        parentElement.appendChild(poweredByLink);

        // Set display: block; to .company_name
        parentElement.style.display = "block";
        parentElement.style.setProperty("display", "block", "important");
    }
  });