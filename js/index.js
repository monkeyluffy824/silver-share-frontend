function theme(color) {
  ui("theme", color || "#f9bd99");
}

const mode = () => {
  let newMode = ui("mode") == "dark" ? "light" : "dark";
  document.getElementById("modeText").innerHTML  = document.getElementById("modeText").innerHTML  === "<i>light_mode</i>" ? "<i>dark_mode</i>" : "<i>light_mode</i>";
  ui("mode", newMode);
}


document.getElementById("modeText").innerHTML  = "<i>light_mode</i>";

window.addEventListener("DOMContentLoaded", () => theme());