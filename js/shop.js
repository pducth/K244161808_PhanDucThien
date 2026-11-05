var Shop = {
    products: [],
    view: [],

    parseProducts: function (xmlDoc) {
        var nodes = xmlDoc.getElementsByTagName("product");
        var list = [];
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            var colors = [], sizes = [], stock = {};
            var colorNodes = n.getElementsByTagName("color");
            for (var c = 0; c < colorNodes.length; c++) colors.push(colorNodes[c].childNodes[0].nodeValue);
            var variants = n.getElementsByTagName("variant");
            for (var v = 0; v < variants.length; v++) {
                var col = variants[v].getAttribute("color");
                var size = variants[v].getAttribute("size");
                stock[col + "|" + size] = parseInt(variants[v].getAttribute("quantity"), 10);
                if (sizes.indexOf(size) < 0) sizes.push(size);
            }
            list.push({
                id: n.getAttribute("id"),
                title: getText(n, "title"),
                price: parseFloat(getText(n, "price")),
                description: getText(n, "description"),
                category: getText(n, "category"),
                image: getText(n, "image"),
                rate: parseFloat(getText(n, "rate")),
                count: parseInt(getText(n, "count"), 10),
                colors: colors, sizes: sizes, stock: stock
            });
        }
        return list;
    },

    byId: function (id) {
        for (var i = 0; i < this.products.length; i++) if (this.products[i].id == id) return this.products[i];
        return null;
    },

    stockOf: function (id, color, size) {
        var p = this.byId(id);
        return p && p.stock[color + "|" + size] != null ? p.stock[color + "|" + size] : 0;
    },

    defaultVariant: function (p) {
        for (var key in p.stock) if (p.stock[key] > 0) return key.split("|");
        var first = Object.keys(p.stock)[0].split("|");
        return first;
    },

    showSkeleton: function (n) {
        var html = "";
        for (var i = 0; i < n; i++) {
            html += "<article class='product-card skeleton' aria-hidden='true'>" +
                "<div class='sk sk-img'></div><div class='sk sk-line'></div>" +
                "<div class='sk sk-line short'></div><div class='sk sk-line short'></div>" +
                "<div class='sk sk-btn'></div></article>";
        }
        document.getElementById("productGrid").innerHTML = html;
    },

    render: function (list) {
        this.view = list;
        document.getElementById("resultCount").textContent = list.length + " sản phẩm";
        if (list.length == 0) {
            document.getElementById("productGrid").innerHTML =
                "<p style='grid-column:1/-1'>Không có sản phẩm phù hợp với bộ lọc.</p>";
            return;
        }
        var html = "";
        for (var i = 0; i < list.length; i++) {
            var p = list[i];
            var dv = this.defaultVariant(p);
            var color = dv[0], size = dv[1];
            html += "<article class='product-card' data-id='" + p.id + "' data-color='" + esc(color) + "' data-size='" + esc(size) + "'>" +
                "<div class='thumb'><img src='" + esc(p.image) + "' alt='" + esc(p.title) + "' loading='lazy'></div>" +
                "<div class='body'>" +
                "<span class='cat'>" + esc(p.category) + "</span>" +
                "<h3 title='" + esc(p.title) + "'>" + esc(p.title) + "</h3>" +
                "<div class='price'>" + money(p.price) + "</div>" +
                "<div class='options'><span class='opt-label'>Màu:</span>" + this.chips(p.colors, color, "pick-color") + "</div>" +
                "<div class='options'><span class='opt-label'>Size:</span>" + this.chips(p.sizes, size, "pick-size") + "</div>" +
                "<div class='stock'></div>" +
                "<div class='card-actions'>" +
                this.btn("add", "btn btn-wide", "Thêm vào giỏ hàng", p.id, color, size) +
                this.btn("quick", "btn btn-light", "Xem nhanh", p.id, color, size) +
                "<button class='btn btn-light' data-action='rating' data-id='" + p.id + "'>Rating Detail</button>" +
                "</div></div></article>";
        }
        document.getElementById("productGrid").innerHTML = html;

        var cards = document.querySelectorAll("#productGrid .product-card");
        for (var c = 0; c < cards.length; c++) this.refreshCard(cards[c]);
        Reviews.attachStars();
    },

    chips: function (arr, active, action) {
        var s = "";
        for (var i = 0; i < arr.length; i++) {
            s += "<button type='button' class='chip" + (arr[i] == active ? " active" : "") +
                "' data-action='" + action + "' data-value='" + esc(arr[i]) + "'>" + esc(arr[i]) + "</button>";
        }
        return s;
    },

    btn: function (action, cls, label, id, color, size) {
        return "<button class='" + cls + "' data-action='" + action + "' data-id='" + id +
            "' data-variant='" + esc(color + "|" + size) + "'>" + label + "</button>";
    },

    refreshCard: function (card) {
        var id = card.getAttribute("data-id");
        var color = card.getAttribute("data-color");
        var size = card.getAttribute("data-size");
        var variant = color + "|" + size;
        var qty = this.stockOf(id, color, size);

        var chips = card.querySelectorAll(".chip");
        for (var i = 0; i < chips.length; i++) {
            var act = chips[i].getAttribute("data-action");
            var val = chips[i].getAttribute("data-value");
            chips[i].classList.toggle("active", act == "pick-color" ? val == color : val == size);
        }
        var btns = card.querySelectorAll("[data-variant]");
        for (var b = 0; b < btns.length; b++) btns[b].setAttribute("data-variant", variant);

        var stockEl = card.querySelector(".stock");
        stockEl.textContent = qty > 0 ? "Còn " + qty + " sản phẩm" : "Hết hàng";
        stockEl.className = "stock" + (qty > 0 ? "" : " out");
        card.querySelector("[data-action=add]").disabled = qty <= 0;
    },

    bindGrid: function () {
        var self = this;
        document.getElementById("productGrid").addEventListener("click", function (e) {
            var el = e.target.closest("[data-action]");
            if (!el || !this.contains(el)) return;
            var action = el.getAttribute("data-action");
            var card = el.closest(".product-card");

            if (action == "pick-color" || action == "pick-size") {
                card.setAttribute(action == "pick-color" ? "data-color" : "data-size", el.getAttribute("data-value"));
                self.refreshCard(card);
                return;
            }

            var id = el.getAttribute("data-id");
            var variant = el.getAttribute("data-variant");
            console.log("[Event Delegation]", action, "data-id=" + id, "data-variant=" + variant);
            var product = self.byId(id);
            if (!product) return;

            if (action == "add") {
                var v = variant.split("|");
                var res = Cart.add(product, v[0], v[1]);
                showToast(res.msg);
                if (res.ok) Cart.toggle(true);
            } else if (action == "quick") {
                self.quickView(product, variant);
            } else if (action == "rating") {
                openModal(Reviews.detailHTML(product));
            }
        });
    },

    quickView: function (p, variant) {
        var v = variant.split("|");
        var qty = this.stockOf(p.id, v[0], v[1]);
        openModal(
            "<h2>Xem nhanh</h2><div class='quick-view'>" +
            "<img src='" + esc(p.image) + "' alt='" + esc(p.title) + "'>" +
            "<div><h3>" + esc(p.title) + "</h3>" +
            "<div class='price'>" + money(p.price) + "</div>" +
            "<p class='cat'>" + esc(p.category) + "</p>" +
            "<p class='hint' style='margin:0 0 8px'>data-id=" + p.id + ", data-variant=" + esc(variant) + "</p>" +
            "<p>" + esc(p.description) + "</p>" +
            "<p>Màu: <b>" + esc(v[0]) + "</b> - Size: <b>" + esc(v[1]) + "</b><br>" +
            (qty > 0 ? "Còn " + qty + " sản phẩm" : "<span style='color:#c92a2a'>Hết hàng</span>") + "</p>" +
            "<button class='btn' data-action='modal-add' data-id='" + p.id + "' data-variant='" + esc(variant) + "'" +
            (qty > 0 ? "" : " disabled") + ">Thêm vào giỏ hàng</button></div></div>");
    },

    fillFilters: function () {
        var cats = [], colors = [];
        for (var i = 0; i < this.products.length; i++) {
            var p = this.products[i];
            if (cats.indexOf(p.category) < 0) cats.push(p.category);
            for (var c = 0; c < p.colors.length; c++) if (colors.indexOf(p.colors[c]) < 0) colors.push(p.colors[c]);
        }
        var selCat = document.getElementById("fCategory");
        for (var a = 0; a < cats.length; a++) selCat.innerHTML += "<option value='" + esc(cats[a]) + "'>" + esc(cats[a]) + "</option>";
        var selColor = document.getElementById("fColor");
        for (var b = 0; b < colors.length; b++) selColor.innerHTML += "<option value='" + esc(colors[b]) + "'>" + esc(colors[b]) + "</option>";
    },

    applyFilter: function () {
        var f = document.getElementById("searchForm");
        var kw = f.keyword.value.trim().toLowerCase();
        var min = f.minPrice.value === "" ? 0 : parseFloat(f.minPrice.value);
        var max = f.maxPrice.value === "" ? Infinity : parseFloat(f.maxPrice.value);
        var color = f.color.value;
        var rating = f.rating.value === "" ? 0 : parseFloat(f.rating.value);
        var cat = f.category.value;
        var out = [];
        for (var i = 0; i < this.products.length; i++) {
            var p = this.products[i];
            if (kw && p.title.toLowerCase().indexOf(kw) < 0) continue;
            if (p.price < min || p.price > max) continue;
            if (color && p.colors.indexOf(color) < 0) continue;
            if (cat && p.category != cat) continue;
            var avg = Reviews.averageOf(p.id) || p.rate;
            if (avg < rating) continue;
            out.push(p);
        }
        this.render(out);
    },

    bindSearch: function () {
        var self = this;
        var f = document.getElementById("searchForm");

        function checkRange() {
            var lo = f.minPrice.value, hi = f.maxPrice.value;
            f.maxPrice.setCustomValidity(lo !== "" && hi !== "" && parseFloat(hi) < parseFloat(lo) ? "Giá đến phải lớn hơn hoặc bằng giá từ" : "");
        }
        f.minPrice.addEventListener("input", checkRange);
        f.maxPrice.addEventListener("input", checkRange);
        f.addEventListener("submit", function (e) {
            e.preventDefault();
            self.applyFilter();
        });
        f.addEventListener("reset", function () {
            setTimeout(function () { f.maxPrice.setCustomValidity(""); self.applyFilter(); }, 0);
        });
    },

    init: function () {
        var self = this;
        this.showSkeleton(8);
        this.bindGrid();
        this.bindSearch();

        setTimeout(function () {
            loadXML("dataset/products.xml", function (xmlDoc) {
                if (!xmlDoc) {
                    document.getElementById("productGrid").innerHTML =
                        "<p style='grid-column:1/-1'>Không tải được products.xml (hãy chạy bằng Live Server / GitHub Pages).</p>";
                    return;
                }
                self.products = self.parseProducts(xmlDoc);
                self.fillFilters();
                loadJSON("dataset/customers.json", function (customers) {
                    (customers || []).forEach(function (c) { Reviews.customers[c.id] = c.name; });
                    loadXML("dataset/reviews.xml", function (doc, text) {
                        if (text) Reviews.parseXML(text);
                        self.render(self.products);
                    });
                });
            });
        }, 900);
    }
};

function openModal(html) {
    document.getElementById("modalBody").innerHTML = html;
    document.getElementById("modal").classList.add("open");
}
function closeModal() {
    document.getElementById("modal").classList.remove("open");
}
