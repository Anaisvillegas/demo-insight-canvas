// Mobile Menu Toggle Logic
document.addEventListener('DOMContentLoaded', function() {
  const menuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden'); // Toggles visibility
    });
    
    // Close mobile menu when a link inside it is clicked
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden'); // Hides the menu
      });
    });
  }
  
  // Fade-in sections on scroll Intersection Observer Logic
  const fadeInSections = document.querySelectorAll('.fade-in-section');
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1 // Trigger when 10% is visible
  };
  
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible'); // Add class to trigger CSS animation
        observer.unobserve(entry.target); // Stop observing once animated
      }
    });
  }, observerOptions);
  
  fadeInSections.forEach(section => {
    observer.observe(section);
  });
});
