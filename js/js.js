window.addEventListener("load", function () {
    var form = document.getElementById("form");
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        sendData();
    });
    function sendData() {
        form = document.getElementById("form");
        // Bind the FormData object and the form element
        var FD = new FormData(form);
    }
});