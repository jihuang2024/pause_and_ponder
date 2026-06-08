// Initialize theme from localStorage or system preference
function initTheme() {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (stored) {
        document.documentElement.classList.toggle('dark-mode', stored === 'dark');
    } else if (prefersDark) {
        document.documentElement.classList.add('dark-mode');
    }
    
    updateButtonText();
}

// Toggle theme
function toggleTheme() {
    document.documentElement.classList.toggle('dark-mode');
    const isDark = document.documentElement.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateButtonText();
}

// Update button text
function updateButtonText() {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        const isDark = document.documentElement.classList.contains('dark-mode');
        btn.textContent = isDark ? '☀️ Light' : '🌙 Dark';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initTheme);
