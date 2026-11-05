var Admin = {
    LOW_STOCK: 40,
    STATUSES: ["Đã thanh toán", "Đã giao", "Đang xử lý", "Đã hủy"],
    employees: [],
    customers: [],
    products: [],
    orders: [],
    openOrder: null,

    init: function () {
        var self = this;
        loadJSON("dataset/employees.json", function (list) { self.employees = list || []; });
        loadJSON("dataset/customers.json", function (list) { self.customers = list || []; });

        document.getElementById("pwToggle").addEventListener("click", function () {
            var input = document.getElementById("password");
            var show = input.type == "password";
            input.type = show ? "text" : "password";
            this.querySelector(".eye-on").style.display = show ? "none" : "";
            this.querySelector(".eye-off").style.display = show ? "" : "none";
            this.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
        });

        document.getElementById("loginForm").addEventListener("submit", function (e) {
            e.preventDefault();
            self.login(this.username.value.trim(), this.password.value);
        });

        document.getElementById("btnLogout").addEventListener("click", function () {
            sessionStorage.removeItem("adminUser");
            location.reload();
        });

        document.getElementById("sideMenu").addEventListener("click", function (e) {
            var btn = e.target.closest("[data-view]");
            if (btn) self.showView(btn.getAttribute("data-view"));
        });

        var orderInputs = ["orderSearch", "statusFilter", "dateFrom", "dateTo", "orderSort"];
        orderInputs.forEach(function (id) {
            var el = document.getElementById(id);
            el.addEventListener(el.tagName == "INPUT" && el.type == "search" ? "input" : "change", function () {
                self.openOrder = null;
                self.renderOrders();
            });
        });
        ["productSearch", "productCategory", "productFilter", "productSort"].forEach(function (id) {
            var el = document.getElementById(id);
            el.addEventListener(el.type == "search" ? "input" : "change", function () { self.renderProducts(); });
        });
        document.getElementById("customerSearch").addEventListener("input", function () { self.renderCustomers(); });
        document.getElementById("btnExport").addEventListener("click", function () { self.exportCSV(); });

        document.getElementById("orderBody").addEventListener("click", function (e) {
            var save = e.target.closest("[data-action=save-status]");
            if (save) {
                var sel = document.getElementById("status_" + save.getAttribute("data-id"));
                self.updateStatus(save.getAttribute("data-id"), sel.value);
                return;
            }
            if (e.target.closest(".detail-row")) return;
            var row = e.target.closest("tr.order-row");
            if (!row) return;
            var id = row.getAttribute("data-id");
            self.openOrder = self.openOrder == id ? null : id;
            self.renderOrders();
        });

        var logged = sessionStorage.getItem("adminUser");
        if (logged) this.showDashboard(JSON.parse(logged));
    },

    login: function (username, password) {
        var err = document.getElementById("loginError");
        for (var i = 0; i < this.employees.length; i++) {
            var e = this.employees[i];
            if (e.username == username && e.password == password) {
                var user = { id: e.id, name: e.name, role: e.role };
                sessionStorage.setItem("adminUser", JSON.stringify(user));
                err.textContent = "";
                this.showDashboard(user);
                return;
            }
        }
        err.textContent = "Sai tên đăng nhập hoặc mật khẩu";
    },

    showDashboard: function (user) {
        document.getElementById("loginBox").hidden = true;
        document.getElementById("dashboard").hidden = false;
        document.getElementById("whoName").textContent = user.name;
        document.getElementById("whoRole").textContent = user.role;
        this.loadData();
    },

    showView: function (name) {
        var buttons = document.querySelectorAll("#sideMenu [data-view]");
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle("active", buttons[i].getAttribute("data-view") == name);
        }
        var views = document.querySelectorAll(".admin-content .view");
        for (var j = 0; j < views.length; j++) views[j].hidden = views[j].id != "view-" + name;
    },

    loadData: function () {
        var self = this;
        var waitFor = setInterval(function () {
            if (self.employees.length == 0 || self.customers.length == 0) return;
            clearInterval(waitFor);
            loadXML("dataset/products.xml", function (pdoc) {
                self.products = self.parseProducts(pdoc);
                loadXML("dataset/carts.xml", function (cdoc) {
                    self.orders = self.parseCarts(cdoc).concat(self.localOrders());
                    self.applyStatusOverrides();
                    self.fillCategories();
                    self.renderAll();
                });
            });
        }, 50);
    },

    parseProducts: function (doc) {
        var list = [];
        if (!doc) return list;
        var nodes = doc.getElementsByTagName("product");
        for (var i = 0; i < nodes.length; i++) {
            list.push({
                id: nodes[i].getAttribute("id"),
                title: getText(nodes[i], "title"),
                category: getText(nodes[i], "category"),
                image: getText(nodes[i], "image"),
                price: parseFloat(getText(nodes[i], "price")),
                stock: parseInt(getText(nodes[i], "total_stock"), 10)
            });
        }
        return list;
    },

    productById: function (id) {
        for (var i = 0; i < this.products.length; i++) if (this.products[i].id == id) return this.products[i];
        return null;
    },

    customerById: function (id) {
        for (var i = 0; i < this.customers.length; i++) if (this.customers[i].id == id) return this.customers[i];
        return null;
    },

    employeeById: function (id) {
        for (var i = 0; i < this.employees.length; i++) if (this.employees[i].id == id) return this.employees[i];
        return null;
    },

    parseCarts: function (doc) {
        var list = [];
        if (!doc) return list;
        var carts = doc.getElementsByTagName("cart");
        for (var i = 0; i < carts.length; i++) {
            var c = carts[i];
            var items = [], qty = 0;
            var its = c.getElementsByTagName("item");
            for (var j = 0; j < its.length; j++) {
                var pid = its[j].getAttribute("product_id");
                var p = this.productById(pid);
                var q = parseInt(its[j].getAttribute("quantity"), 10);
                qty += q;
                items.push({
                    id: pid, title: p ? p.title : "Sản phẩm " + pid, category: p ? p.category : "khác",
                    qty: q, price: parseFloat(its[j].getAttribute("price")),
                    color: its[j].getAttribute("color"), size: its[j].getAttribute("size")
                });
            }
            var cust = this.customerById(getText(c, "customer_id"));
            var emp = this.employeeById(getText(c, "employee_id"));
            list.push({
                id: c.getAttribute("id"), date: getText(c, "created_date"),
                employeeId: emp ? emp.id : "", employee: emp ? emp.name : getText(c, "employee_id"),
                customerId: cust ? cust.id : "", customer: cust ? cust.name : getText(c, "customer_id"),
                contact: cust ? { phone: cust.phone, email: cust.email, address: cust.address } : {},
                items: items, qty: qty, total: parseFloat(getText(c, "total")), status: getText(c, "status")
            });
        }
        return list;
    },

    localOrders: function () {
        return lsGet("orders", []).map(function (o) {
            var qty = 0;
            var items = o.items.map(function (it) {
                qty += it.qty;
                var p = Admin.productById(it.id);
                return {
                    id: it.id, title: it.title, category: p ? p.category : "khác",
                    qty: it.qty, price: it.price, color: it.color, size: it.size
                };
            });
            return {
                id: o.id, date: o.created_date, employeeId: "", employee: "Website (online)",
                customerId: "", customer: o.customer.name,
                contact: { phone: o.customer.phone, email: o.customer.email, address: o.customer.address },
                items: items, qty: qty, total: o.total, status: o.status
            };
        });
    },

    applyStatusOverrides: function () {
        var map = lsGet("orderStatus", {});
        this.orders.forEach(function (o) { if (map[o.id]) o.status = map[o.id]; });
    },

    updateStatus: function (id, status) {
        var map = lsGet("orderStatus", {});
        map[id] = status;
        lsSet("orderStatus", map);
        this.orders.forEach(function (o) { if (o.id == id) o.status = status; });
        this.renderAll();
    },

    validOrders: function () {
        return this.orders.filter(function (o) { return o.status != "Đã hủy"; });
    },

    statusClass: function (s) {
        return s == "Đã thanh toán" ? "paid" : s == "Đã giao" ? "shipped" : s == "Đã hủy" ? "cancel" : "pending";
    },

    badge: function (s) {
        return "<span class='badge " + this.statusClass(s) + "'>" + esc(s) + "</span>";
    },

    fmtDate: function (d) {
        var p = d.split("-");
        return p.length == 3 ? p[2] + "/" + p[1] + "/" + p[0] : d;
    },

    soldMap: function () {
        var map = {};
        this.validOrders().forEach(function (o) {
            o.items.forEach(function (it) {
                if (!map[it.id]) map[it.id] = { qty: 0, revenue: 0 };
                map[it.id].qty += it.qty;
                map[it.id].revenue += it.qty * it.price;
            });
        });
        return map;
    },

    renderAll: function () {
        this.renderOverview();
        this.renderOrders();
        this.renderProducts();
        this.renderCustomers();
        this.renderEmployees();
    },

    hbars: function (rows, max, money_) {
        var html = "";
        rows.forEach(function (r) {
            html += "<div class='hbar'><span class='name'>" + esc(r.name) + "</span>" +
                "<div class='bar'><i style='width:" + (max ? Math.round(r.value / max * 100) : 0) + "%'></i></div>" +
                "<span class='val'>" + (money_ ? money(r.value) : r.value) + "</span></div>";
        });
        return html || "<p class='hint'>Chưa có dữ liệu</p>";
    },

    renderOverview: function () {
        var valid = this.validOrders();
        var revenue = 0, sold = 0, buyers = {}, pending = 0;
        valid.forEach(function (o) {
            revenue += o.total;
            sold += o.qty;
            buyers[o.customerId || o.customer] = 1;
        });
        this.orders.forEach(function (o) { if (o.status == "Đang xử lý") pending++; });
        var stock = 0, low = 0, self = this;
        this.products.forEach(function (p) {
            stock += p.stock;
            if (p.stock <= self.LOW_STOCK) low++;
        });
        document.getElementById("stOrders").textContent = this.orders.length;
        document.getElementById("stRevenue").textContent = money(revenue);
        document.getElementById("stSold").textContent = sold;
        document.getElementById("stAvg").textContent = money(valid.length ? revenue / valid.length : 0);
        document.getElementById("stCustomers").textContent = Object.keys(buyers).length;
        document.getElementById("stPending").textContent = pending;
        document.getElementById("stStock").textContent = stock;
        document.getElementById("stLow").textContent = low;

        var byDay = {};
        valid.forEach(function (o) { byDay[o.date] = (byDay[o.date] || 0) + o.total; });
        var days = Object.keys(byDay).sort().slice(-10);
        var maxDay = 0;
        days.forEach(function (d) { if (byDay[d] > maxDay) maxDay = byDay[d]; });
        var colHtml = "";
        days.forEach(function (d) {
            colHtml += "<div class='col'><b>" + Math.round(byDay[d]) + "</b><i style='height:" +
                Math.max(3, Math.round(byDay[d] / maxDay * 80)) + "%'></i><span>" + self.fmtDate(d).slice(0, 5) + "</span></div>";
        });
        document.getElementById("chartDay").innerHTML = colHtml || "<p class='hint'>Chưa có dữ liệu</p>";

        var byCat = {};
        valid.forEach(function (o) {
            o.items.forEach(function (it) { byCat[it.category] = (byCat[it.category] || 0) + it.qty * it.price; });
        });
        var catRows = Object.keys(byCat).map(function (k) { return { name: k, value: byCat[k] }; });
        catRows.sort(function (a, b) { return b.value - a.value; });
        document.getElementById("chartCategory").innerHTML = this.hbars(catRows, catRows.length ? catRows[0].value : 0, true);

        var statusRows = this.STATUSES.map(function (s) {
            return { name: s, value: self.orders.filter(function (o) { return o.status == s; }).length };
        });
        var maxStatus = 0;
        statusRows.forEach(function (r) { if (r.value > maxStatus) maxStatus = r.value; });
        document.getElementById("chartStatus").innerHTML = this.hbars(statusRows, maxStatus, false);

        var sm = this.soldMap();
        var top = Object.keys(sm).map(function (id) {
            var p = self.productById(id);
            return { title: p ? p.title : id, qty: sm[id].qty, revenue: sm[id].revenue };
        });
        top.sort(function (a, b) { return b.qty - a.qty; });
        var topHtml = "";
        top.slice(0, 5).forEach(function (t) {
            topHtml += "<tr><td>" + esc(t.title) + "</td><td class='num'>" + t.qty + "</td><td class='num'>" + money(t.revenue) + "</td></tr>";
        });
        document.getElementById("topBody").innerHTML = topHtml || "<tr><td colspan='3' class='empty-row'>Chưa có dữ liệu</td></tr>";

        var recent = this.orders.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).slice(0, 5);
        var recentHtml = "";
        recent.forEach(function (o) {
            recentHtml += "<tr><td>" + esc(o.id) + "</td><td>" + self.fmtDate(o.date) + "</td><td>" + esc(o.customer) +
                "</td><td class='num'>" + money(o.total) + "</td><td>" + self.badge(o.status) + "</td></tr>";
        });
        document.getElementById("recentBody").innerHTML = recentHtml || "<tr><td colspan='5' class='empty-row'>Chưa có đơn hàng</td></tr>";
    },

    filteredOrders: function () {
        var kw = document.getElementById("orderSearch").value.trim().toLowerCase();
        var st = document.getElementById("statusFilter").value;
        var from = document.getElementById("dateFrom").value;
        var to = document.getElementById("dateTo").value;
        var sort = document.getElementById("orderSort").value;
        var list = this.orders.filter(function (o) {
            if (st && o.status != st) return false;
            if (from && o.date < from) return false;
            if (to && o.date > to) return false;
            if (kw && (o.id + " " + o.customer + " " + o.employee).toLowerCase().indexOf(kw) < 0) return false;
            return true;
        });
        list.sort(function (a, b) {
            if (sort == "date-asc") return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
            if (sort == "total-desc") return b.total - a.total;
            if (sort == "total-asc") return a.total - b.total;
            return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
        });
        return list;
    },

    renderOrders: function () {
        var list = this.filteredOrders();
        var self = this, html = "";
        list.forEach(function (o) {
            var opened = self.openOrder == o.id;
            html += "<tr class='order-row' data-id='" + esc(o.id) + "'><td>" + esc(o.id) + "</td><td>" + self.fmtDate(o.date) +
                "</td><td>" + esc(o.employee) + "</td><td>" + esc(o.customer) + "</td><td class='num'>" + o.qty +
                "</td><td class='num'>" + money(o.total) + "</td><td>" + self.badge(o.status) + "</td></tr>";
            if (opened) html += self.detailRow(o);
        });
        document.getElementById("orderBody").innerHTML = html || "<tr><td colspan='7' class='empty-row'>Không có đơn hàng phù hợp</td></tr>";
        document.getElementById("orderCount").textContent = list.length + " / " + this.orders.length + " đơn";
    },

    detailRow: function (o) {
        var items = "";
        o.items.forEach(function (it) {
            items += "<tr><td>" + esc(it.title) + "</td><td>" + esc(it.color) + " / " + esc(it.size) + "</td><td class='num'>" +
                it.qty + "</td><td class='num'>" + money(it.price) + "</td><td class='num'>" + money(it.qty * it.price) + "</td></tr>";
        });
        var options = this.STATUSES.map(function (s) {
            return "<option" + (s == o.status ? " selected" : "") + ">" + s + "</option>";
        }).join("");
        var c = o.contact || {};
        return "<tr class='detail-row'><td colspan='7'><div class='detail-grid'>" +
            "<div><h4>Thông tin đơn hàng</h4>" +
            "Khách hàng: <b>" + esc(o.customer) + "</b><br>" +
            "Điện thoại: " + esc(c.phone || "Chưa có") + "<br>" +
            "Email: " + esc(c.email || "Chưa có") + "<br>" +
            "Địa chỉ: " + esc(c.address || "Chưa có") + "<br>" +
            "Nhân viên phụ trách: " + esc(o.employee) + "<br>" +
            "Ngày tạo: " + this.fmtDate(o.date) +
            "<div class='detail-actions'><select id='status_" + esc(o.id) + "'>" + options + "</select>" +
            "<button class='btn' type='button' data-action='save-status' data-id='" + esc(o.id) + "'>Cập nhật trạng thái</button></div></div>" +
            "<div><h4>Chi tiết hóa đơn</h4><table class='data'><thead><tr><th>Sản phẩm</th><th>Màu / Size</th><th class='num'>SL</th><th class='num'>Đơn giá</th><th class='num'>Thành tiền</th></tr></thead><tbody>" +
            items + "</tbody></table><p><b>Tổng cộng: " + money(o.total) + "</b></p></div></div></td></tr>";
    },

    exportCSV: function () {
        var rows = [["Ma don", "Ngay tao", "Nhan vien", "Khach hang", "So luong", "Tong tien", "Trang thai"]];
        this.filteredOrders().forEach(function (o) {
            rows.push([o.id, o.date, o.employee, o.customer, o.qty, o.total.toFixed(2), o.status]);
        });
        var csv = rows.map(function (r) {
            return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(",");
        }).join("\n");
        var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "don-hang.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    fillCategories: function () {
        var sel = document.getElementById("productCategory");
        var seen = {};
        this.products.forEach(function (p) {
            if (!seen[p.category]) {
                seen[p.category] = 1;
                sel.innerHTML += "<option value='" + esc(p.category) + "'>" + esc(p.category) + "</option>";
            }
        });
    },

    renderProducts: function () {
        var kw = document.getElementById("productSearch").value.trim().toLowerCase();
        var cat = document.getElementById("productCategory").value;
        var flt = document.getElementById("productFilter").value;
        var sort = document.getElementById("productSort").value;
        var sm = this.soldMap(), self = this;
        var list = this.products.map(function (p) {
            var s = sm[p.id] || { qty: 0, revenue: 0 };
            return { p: p, sold: s.qty, revenue: s.revenue };
        }).filter(function (r) {
            if (kw && r.p.title.toLowerCase().indexOf(kw) < 0) return false;
            if (cat && r.p.category != cat) return false;
            if (flt == "sold" && r.sold == 0) return false;
            if (flt == "unsold" && r.sold > 0) return false;
            if (flt == "low" && r.p.stock > self.LOW_STOCK) return false;
            return true;
        });
        list.sort(function (a, b) {
            if (sort == "revenue-desc") return b.revenue - a.revenue;
            if (sort == "stock-asc") return a.p.stock - b.p.stock;
            if (sort == "price-desc") return b.p.price - a.p.price;
            if (sort == "id-asc") return a.p.id - b.p.id;
            return b.sold - a.sold;
        });
        var html = "";
        list.forEach(function (r) {
            var state = r.p.stock == 0 ? "<span class='badge low'>Hết hàng</span>" :
                r.p.stock <= self.LOW_STOCK ? "<span class='badge low'>Sắp hết</span>" : "<span class='badge ok'>Còn hàng</span>";
            html += "<tr><td>" + r.p.id + "</td><td><img class='thumb-sm' src='" + esc(r.p.image) + "' alt=''></td><td>" + esc(r.p.title) +
                "</td><td style='text-transform:capitalize'>" + esc(r.p.category) + "</td><td class='num'>" + money(r.p.price) +
                "</td><td class='num'>" + r.p.stock + "</td><td class='num'>" + r.sold + "</td><td class='num'>" + money(r.revenue) +
                "</td><td>" + state + "</td></tr>";
        });
        document.getElementById("productBody").innerHTML = html || "<tr><td colspan='9' class='empty-row'>Không có sản phẩm phù hợp</td></tr>";
        document.getElementById("productCount").textContent = list.length + " / " + this.products.length + " sản phẩm";
    },

    customerRows: function () {
        var rows = {};
        this.customers.forEach(function (c) {
            rows[c.id] = { id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address, orders: 0, spent: 0 };
        });
        this.validOrders().forEach(function (o) {
            var key = o.customerId;
            if (!key) {
                key = "WEB-" + (o.contact.phone || o.customer);
                if (!rows[key]) {
                    rows[key] = { id: "Online", name: o.customer, phone: o.contact.phone || "", email: o.contact.email || "", address: o.contact.address || "", orders: 0, spent: 0 };
                }
            }
            if (rows[key]) {
                rows[key].orders++;
                rows[key].spent += o.total;
            }
        });
        return Object.keys(rows).map(function (k) { return rows[k]; });
    },

    renderCustomers: function () {
        var kw = document.getElementById("customerSearch").value.trim().toLowerCase();
        var list = this.customerRows().filter(function (c) {
            return !kw || (c.name + " " + c.email + " " + c.phone).toLowerCase().indexOf(kw) >= 0;
        });
        list.sort(function (a, b) { return b.spent - a.spent; });
        var html = "";
        list.forEach(function (c) {
            html += "<tr><td>" + esc(c.id) + "</td><td>" + esc(c.name) + "</td><td>" + esc(c.phone) + "</td><td>" + esc(c.email) +
                "</td><td>" + esc(c.address) + "</td><td class='num'>" + c.orders + "</td><td class='num'>" + money(c.spent) + "</td></tr>";
        });
        document.getElementById("customerBody").innerHTML = html || "<tr><td colspan='7' class='empty-row'>Không có khách hàng phù hợp</td></tr>";
        document.getElementById("customerCount").textContent = list.length + " khách hàng";
    },

    renderEmployees: function () {
        var stats = {};
        this.employees.forEach(function (e) { stats[e.id] = { orders: 0, revenue: 0 }; });
        this.validOrders().forEach(function (o) {
            if (stats[o.employeeId]) {
                stats[o.employeeId].orders++;
                stats[o.employeeId].revenue += o.total;
            }
        });
        var max = 0;
        Object.keys(stats).forEach(function (k) { if (stats[k].revenue > max) max = stats[k].revenue; });
        var html = "";
        this.employees.forEach(function (e) {
            var s = stats[e.id];
            html += "<tr><td>" + esc(e.id) + "</td><td>" + esc(e.name) + "</td><td>" + esc(e.role) + "</td><td>" + esc(e.email) +
                "</td><td class='num'>" + s.orders + "</td><td class='num'>" + money(s.revenue) +
                "</td><td><div class='bar'><i style='width:" + (max ? Math.round(s.revenue / max * 100) : 0) + "%'></i></div></td></tr>";
        });
        document.getElementById("employeeBody").innerHTML = html;
        document.getElementById("employeeCount").textContent = this.employees.length + " nhân viên";
    }
};
