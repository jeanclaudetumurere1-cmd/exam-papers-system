(function () {
    function blockEvent(event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }

    document.addEventListener('contextmenu', blockEvent);
    document.addEventListener('keydown', function (event) {
        const key = String(event.key || '').toLowerCase();
        const blocked =
            (event.ctrlKey && key === 'u') ||
            (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
            key === 'f12';

        if (blocked) {
            blockEvent(event);
        }
    });
})();
