var Cart = {
    items: [],

    init: function () {
        this.items = lsGet("cart", []);
        this.render();
        var self = this;

        document.getElementById("miniCart").addEventListener("click", function (e) {
            e.stopPropagation();
            var btn = e.target.closest("[data-action]");
            if (!btn) return;
            var action = btn.getAttribute("data-action");
            var key = btn.getAttribute("data-key");
            if (action == "inc") self.changeQty(key, 1);
            else if (action == "dec") self.changeQty(key, -1);
            else if (action == "remove") self.remove(key);
            else if (action == "checkout") { self.toggle(false); Checkout.open(); }
            else if (action == "clear") self.clear();
        });

        document.getElementById("btnCart").addEventListener("click", function (e) {
            e.stopPropagation();
            self.toggle();
        });

        document.addEventListener("click", function (e) {
            if (!e.target.closest("#miniCart") && !e.target.closest("[data-action=add], [data-action=modal-add]")) self.toggle(false);
        });
    },

    key: function (id, color, size) { return id + "|" + color + "|" + size; },

    add: function (product, color, size) {
        var k = this.key(product.id, color, size);
        var inStock = Shop.stockOf(product.id, color, size);
        var line = this.find(k);
        var current = line ? line.qty : 0;
        if (current + 1 > inStock) {
            return { ok: false, msg: "Chỉ còn " + inStock + " sản phẩm cho lựa chọn này" };
        }
        if (line) {
            line.qty++;
        } else {
            this.items.push({
                key: k, id: product.id, title: product.title, image: product.image,
                price: product.price, color: color, size: size, qty: 1
            });
        }
        this.save();
        return { ok: true, msg: "Đã thêm vào giỏ hàng" };
    },

    find: function (key) {
        for (var i = 0; i < this.items.length; i++) {
            if (this.items[i].key == key) return this.items[i];
        }
        return null;
    },

    changeQty: function (key, delta) {
        var line = this.find(key);
        if (!line) return;
        var next = line.qty + delta;
        if (next > Shop.stockOf(line.id, line.color, line.size)) {
            showToast("Vượt quá tồn kho");
            return;
        }
        if (next <= 0) { this.remove(key); return; }
        line.qty = next;
        this.save();
    },

    remove: function (key) {
        this.items = this.items.filter(function (it) { return it.key != key; });
        this.save();
    },

    clear: function () { this.items = []; this.save(); },

    total: function () {
        var sum = 0;
        for (var i = 0; i < this.items.length; i++) sum += this.items[i].price * this.items[i].qty;
        return sum;
    },

    count: function () {
        var n = 0;
        for (var i = 0; i < this.items.length; i++) n += this.items[i].qty;
        return n;
    },

    save: function () { lsSet("cart", this.items); this.render(); },

    toggle: function (force) {
        var el = document.getElementById("miniCart");
        var open = typeof force == "boolean" ? force : !el.classList.contains("open");
        el.classList.toggle("open", open);
    },

    render: function () {
        document.getElementById("cartBadge").textContent = this.count();
        var box = document.getElementById("miniCart");
        if (this.items.length == 0) {
            box.innerHTML = "<h3>Giỏ hàng</h3><div class='empty'>Giỏ hàng đang trống</div>";
            return;
        }
        var rows = "";
        for (var i = 0; i < this.items.length; i++) {
            var it = this.items[i];
            rows += "<tr>" +
                "<td>" + esc(it.title.substring(0, 28)) + (it.title.length > 28 ? "…" : "") +
                "<br><small>" + esc(it.color) + " / " + esc(it.size) + "</small></td>" +
                "<td><button class='qty-btn' data-action='dec' data-key='" + esc(it.key) + "'>−</button> " +
                it.qty +
                " <button class='qty-btn' data-action='inc' data-key='" + esc(it.key) + "'>+</button></td>" +
                "<td class='num'>" + money(it.price * it.qty) + "</td>" +
                "<td><button class='remove-btn' title='Xoá' data-action='remove' data-key='" + esc(it.key) + "'>x</button></td>" +
                "</tr>";
        }
        box.innerHTML =
            "<h3>Giỏ hàng (" + this.count() + ")</h3>" +
            "<table><thead><tr><th>Sản phẩm</th><th>SL</th><th class='num'>Tiền</th><th></th></tr></thead>" +
            "<tbody>" + rows + "</tbody></table>" +
            "<div class='cart-total'><span>Tổng tiền</span><span>" + money(this.total()) + "</span></div>" +
            "<div class='btn-row'>" +
            "<button class='btn btn-light' data-action='clear'>Xoá hết</button>" +
            "<button class='btn' data-action='checkout'>Thanh toán</button></div>";
    }
};
