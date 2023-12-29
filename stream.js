const messages = document.getElementById("messages");
const source = new EventSource("/sse");
source.addEventListener("time-update", (e) => {
    messages.innerHTML += e.data + "<br/>";
    console.log(e);
});
