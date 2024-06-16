
function timeAgo(timestamp) {
    const now = new Date();
    const postedTime = new Date(timestamp);
    const diff = now - postedTime;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        return 'just now';
    }
}
// feed.js
document.addEventListener('DOMContentLoaded', function() {
    highlightMentions();
});

function highlightMentions() {
    const postContents = document.querySelectorAll('.post-content');

    postContents.forEach(content => {
        // Regular expression to find mentions (words starting with @)
        const mentionRegex = /@(\w+)/g;
        // Regular expression to find URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;

        let html = content.innerHTML;

        // Replace mentions with anchor tags for linking to user profiles
        html = html.replace(mentionRegex, '<a class="text-blue-500" href="/user/$1">@$1</a>');

        // Replace URLs with anchor tags for clickable links
        html = html.replace(urlRegex, '<a class="text-blue-500" href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

        content.innerHTML = html;
    });
}