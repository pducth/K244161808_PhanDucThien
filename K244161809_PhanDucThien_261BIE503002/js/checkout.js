var Checkout = {

    RE_PHONE: /^(0|\+84)(3|5|7|8|9)\d{8}$/,
    RE_EMAIL: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/,
    RE_NAME: /^[A-Za-zÀ-ỹ\s]{2,}$/,

    rules: {
        fullname: { re: null, msg: "Họ tên tối thiểu 2 ký tự, không chứa số" },
        phone: { re: null, msg: "Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678)" },
        email: { re: null, msg: "Email không hợp lệ (VD: ten@gmail.com)" },
        address: { re: /^.{8,}$/, msg: "Địa chỉ giao hàng tối thiểu 8 ký tự" }
    },

    init: function () {
        this.rules.fullname.re = this.RE_NAME;
        this.rules.phone.re = this.RE_PHONE;
        this.rules.email.re = this.RE_EMAIL;
        var modal = document.getElementById("modal");
        var self = this;

        modal.addEventListener("keyup", function (e) {
            if (e.target.closest("#checkoutForm")) self.validateField(e.target);
        });
        modal.addEventListener("focusout", function (e) {
            if (e.target.closest("#checkoutForm")) self.validateField(e.target);
        });
        modal.addEventListener("submit", function (e) {
            if (e.target.id == "checkoutForm") { e.preventDefault(); self.submit(e.target); }
        });
    },

    open: function () {
        if (Cart.items.length == 0) { showToast("Giỏ hàng đang trống"); return; }
        var lines = "";
        for (var i = 0; i < Cart.items.length; i++) {
            var it = Cart.items[i];
            lines += "<li>" + esc(it.title.substring(0, 40)) + " (" + esc(it.color) + "/" + esc(it.size) + ") × " +
                it.qty + " - " + money(it.price * it.qty) + "</li>";
        }
        var html =
            "<h2>Thanh toán</h2>" +
            "<ul class='review-list'>" + lines + "</ul>" +
            "<p><strong>Tổng tiền: " + money(Cart.total()) + "</strong></p>" +
            "<form id='checkoutForm' novalidate>" +
            this.fieldHTML("fullname", "Họ và tên", "text", "Nguyễn Văn A") +
            this.fieldHTML("phone", "Số điện thoại", "tel", "0912345678") +
            this.fieldHTML("email", "Email", "email", "ten@gmail.com") +
            this.fieldHTML("address", "Địa chỉ giao hàng", "text", "Số nhà, đường, quận, thành phố") +
            "<button class='btn' type='submit' style='width:100%'>Xác nhận thanh toán</button>" +
            "</form>";
        openModal(html);
    },

    fieldHTML: function (name, label, type, ph) {
        return "<div class='field'><label for='f_" + name + "'>" + label + "</label>" +
            "<input id='f_" + name + "' name='" + name + "' type='" + type + "' placeholder='" + ph + "' autocomplete='off'>" +
            "<span class='err-msg' id='err_" + name + "'></span></div>";
    },

    validateField: function (input) {
        var rule = this.rules[input.name];
        if (!rule) return true;
        var value = input.value.trim();
        var ok = rule.re.test(value);
        input.classList.toggle("is-invalid", !ok);
        input.classList.toggle("is-valid", ok);
        document.getElementById("err_" + input.name).textContent = ok ? "" : rule.msg;
        return ok;
    },

    submit: function (form) {
        var allOk = true;
        for (var name in this.rules) {
            if (!this.validateField(form.elements[name])) allOk = false;
        }
        if (!allOk) { showToast("Vui lòng kiểm tra lại thông tin"); return; }

        var order = {
            id: "DH" + Date.now(),
            created_date: new Date().toISOString().slice(0, 10),
            customer: {
                name: form.fullname.value.trim(), phone: form.phone.value.trim(),
                email: form.email.value.trim(), address: form.address.value.trim()
            },
            items: Cart.items.slice(),
            total: Cart.total(),
            status: "Đã thanh toán"
        };
        this.fakePaymentAPI(order, function (res) {

            var orders = lsGet("orders", []);
            orders.push(order);
            lsSet("orders", orders);
            Cart.clear();
            openModal("<div class='notice'>Thanh toán thành công!</div>" +
                "<p>Mã đơn hàng: <strong>" + esc(res.orderId) + "</strong><br>Tổng tiền: <strong>" + money(order.total) +
                "</strong><br>Người nhận: " + esc(order.customer.name) + " - " + esc(order.customer.phone) + "</p>" +
                "<button class='btn' data-action='close'>Đóng</button>");
        });
    },

    fakePaymentAPI: function (order, callback) {
        setTimeout(function () { callback({ success: true, orderId: order.id }); }, 800);
    }
};
