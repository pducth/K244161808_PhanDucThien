var Reviews = {
    byProduct: {},
    avg: {},
    customers: {},

    parseXML: function (xmlString) {
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(xmlString, "text/xml");
        var nodes = xmlDoc.getElementsByTagName("review");
        var sum = {}, cnt = {};
        this.byProduct = {};
        for (var i = 0; i < nodes.length; i++) {
            var r = nodes[i];
            var pid = getText(r, "product_id");
            var rating = parseFloat(getText(r, "rating"));
            if (!this.byProduct[pid]) { this.byProduct[pid] = []; sum[pid] = 0; cnt[pid] = 0; }
            this.byProduct[pid].push({
                customer_id: getText(r, "customer_id"),
                rating: rating,
                comment: getText(r, "comment"),
                date: getText(r, "date")
            });
            sum[pid] += rating;
            cnt[pid]++;
        }
        this.avg = {};
        for (var id in sum) this.avg[id] = { avg: sum[id] / cnt[id], count: cnt[id] };
    },

    attachStars: function () {
        var cards = document.querySelectorAll("#productGrid .product-card");
        for (var i = 0; i < cards.length; i++) {
            var id = cards[i].getAttribute("data-id");
            var thumb = cards[i].querySelector(".thumb");
            var old = thumb.querySelector(".stars");
            if (old) thumb.removeChild(old);
            var a = this.avg[id];
            var span = document.createElement("span");
            span.className = "stars";
            if (a) {
                span.innerHTML = "★ " + a.avg.toFixed(1) + "<small>(" + a.count + ")</small>";
                span.title = "Điểm trung bình " + a.avg.toFixed(2) + "/5 từ " + a.count + " khách hàng";
            } else {
                span.textContent = "Chưa có đánh giá";
            }
            thumb.appendChild(span);
        }
    },

    averageOf: function (id) {
        return this.avg[id] ? this.avg[id].avg : 0;
    },

    detailHTML: function (product) {
        var list = this.byProduct[product.id] || [];
        var a = this.avg[product.id];
        var html = "<h2>Chi tiết đánh giá</h2><p><strong>" + esc(product.title) + "</strong><br>" +
            (a ? "Trung bình <b>" + a.avg.toFixed(2) + "/5</b> từ " + a.count + " khách hàng" : "Chưa có đánh giá") + "</p>";
        html += "<ul class='review-list'>";
        for (var i = 0; i < list.length; i++) {
            var r = list[i];
            var stars = "";
            for (var s = 1; s <= 5; s++) stars += s <= r.rating ? "★" : "☆";
            html += "<li><span class='who'>" + esc(this.customers[r.customer_id] || r.customer_id) + "</span> " +
                "<span class='star'>" + stars + "</span> <span class='date'>" + esc(r.date) + "</span><br>" +
                esc(r.comment) + "</li>";
        }
        return html + "</ul>";
    }
};
