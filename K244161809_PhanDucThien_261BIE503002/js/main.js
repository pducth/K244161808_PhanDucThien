function loadXML(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.send();
    xhr.onreadystatechange = function () {
        if (this.readyState == 4) {
            if (this.status == 200) {
                callback(xhr.responseXML, xhr.responseText);
            } else {
                console.error("Không tải được", url, this.status);
                callback(null, null);
            }
        }
    };
}

function loadJSON(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.send();
    xhr.onreadystatechange = function () {
        if (this.readyState == 4) {
            if (this.status == 200) {
                callback(JSON.parse(xhr.responseText));
            } else {
                console.error("Không tải được", url, this.status);
                callback(null);
            }
        }
    };
}

function getText(node, tag) {
    var el = node.getElementsByTagName(tag)[0];
    return el && el.childNodes[0] ? el.childNodes[0].nodeValue : "";
}

function money(n) {
    return "$" + Number(n).toFixed(2);
}

function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : s;
    return d.innerHTML;
}

function showToast(msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.className = "toast show";
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { t.className = "toast"; }, 2200);
}

function lsGet(key, fallback) {
    try {
        var v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
}
function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { }
}
