const forms = [...document.querySelectorAll(".order-form")];
const headerBuy = document.querySelector(".header-buy");
const firstOrder = document.querySelector("#chon-chan");
const offer = document.querySelector(".offer-header");
const discount = 30;
const offerDuration = 90 * 60 * 1000;
const offerStorageKey = "chan-sofa.offer-90m.v1";
const currency = new Intl.NumberFormat("vi-VN");
const asMoney = (amount) => currency.format(amount) + " đ";

function getOfferEnd() {
  const end = Date.now() + offerDuration;
  try {
    const saved = Number(localStorage.getItem(offerStorageKey));
    if (Number.isFinite(saved) && saved > 0) return saved;
    localStorage.setItem(offerStorageKey, String(end));
  } catch {
    // Keep the current visit's countdown running when storage is unavailable.
  }
  return end;
}

const offerEnd = getOfferEnd();
const offerMessage = offer.querySelector("#offer-message");
const clockParts = ["hours", "minutes", "seconds"].map((unit) => offer.querySelector("[data-" + unit + "]"));

function fillOptions(select, prompt, items) {
  select.replaceChildren(new Option(prompt, ""), ...items.map(([code, name]) => new Option(name, code)));
}

function initAddress(form) {
  const { province, district, ward } = form.elements;

  function updateWards() {
    const entry = addressDirectory[province.value];
    const codes = entry?.districts[district.value];
    const wards = entry ? Object.entries(entry.wards) : [];
    const choices = codes ? wards.filter(([code]) => codes.includes(code)) : wards;
    fillOptions(ward, "Phường/xã", choices);
    ward.disabled = !entry;
  }

  function updateProvince() {
    const entry = addressDirectory[province.value];
    const districts = entry ? Object.keys(entry.districts).map((name) => [name, name]) : [];
    fillOptions(district, "Quận/huyện", districts);
    district.disabled = !districts.length;
    updateWards();
  }

  fillOptions(province, "Tỉnh/thành", Object.entries(addressDirectory).map(([code, entry]) => [code, entry.name]));
  province.addEventListener("change", updateProvince);
  district.addEventListener("change", updateWards);
  updateProvince();
}

const quantityDiscounts = new Map([[1, 0], [2, 5], [3, 10]]);

function unitPriceFor(listPrice) {
  return Date.now() < offerEnd ? Math.round(listPrice * (100 - discount) / 100) : listPrice;
}

function bundlePrice(form, count) {
  const size = form.elements.size;
  const startingOption = size.options[1];
  const listPrice = Number(size.selectedOptions[0].dataset.listPrice || startingOption.dataset.listPrice);
  const unitPrice = unitPriceFor(listPrice);
  const bundleDiscount = quantityDiscounts.get(count) || 0;
  return Math.round(unitPrice * count * (100 - bundleDiscount) / 100);
}

function paintQuantity(form) {
  const prefix = form.elements.size.value ? "" : "từ ";
  for (const option of [...form.elements.quantity.options].slice(1)) {
    const count = Number(option.value);
    const shipping = count >= 2 ? " · Freeship" : "";
    option.textContent = "Mua " + count + " · " + prefix + asMoney(bundlePrice(form, count)) + shipping;
  }
}

function paintOffer() {
  const seconds = Math.max(0, Math.ceil((offerEnd - Date.now()) / 1000));
  const values = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60];
  clockParts.forEach((part, index) => { part.textContent = String(values[index]).padStart(2, "0"); });
  offerMessage.textContent = seconds ? "Giảm " + discount + "%" : "Ưu đãi đã kết thúc";
  return seconds;
}

function paintHeroPrice() {
  const listPrice = Number(forms[0].elements.size.options[1].dataset.listPrice);
  const price = unitPriceFor(listPrice);
  const list = document.querySelector("#hero-price-list");
  document.querySelector("#hero-price-value").textContent = asMoney(price);
  list.textContent = asMoney(listPrice);
  list.hidden = price === listPrice;
}

forms.forEach(paintQuantity);
paintHeroPrice();
if (paintOffer()) {
  const timer = setInterval(() => {
    if (paintOffer()) return;
    clearInterval(timer);
    paintHeroPrice();
    forms.forEach((form) => {
      paintQuantity(form);
      form.querySelector(".order-result").hidden = true;
    });
  }, 250);
}



for (const form of forms) {
  initAddress(form);
  form.querySelector(".form-submit").disabled = false;
  form.elements.size.addEventListener("change", () => paintQuantity(form));
  form.addEventListener("input", () => {
    form.querySelector(".order-result").hidden = true;
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = form.querySelector('input[name="color"]:checked').closest("label").querySelector("b").textContent;
    const message = form.querySelector(".order-result");
    const count = Number(data.get("quantity"));
    const shipping = count >= 2 ? " · Freeship" : " · Chưa gồm phí giao hàng";
    message.hidden = false;
    message.textContent = name + " · " + data.get("size") + " · " + count +
      " chiếc · " + asMoney(bundlePrice(form, count)) + shipping +
      ". Đây là bản xem thử, đơn hàng chưa được gửi.";
  });
}

const filter = document.querySelector("#feedback-filter");
const reviews = [...document.querySelectorAll(".feedback-item")];
filter.addEventListener("change", () => {
  reviews.forEach((item) => { item.hidden = filter.value === "photo" && item.dataset.hasPhoto !== "true"; });
  document.querySelector("#feedback-count").textContent =
    reviews.filter((item) => !item.hidden).length + " nhận xét";
});
document.querySelectorAll(".review-like").forEach((button) => {
  button.addEventListener("click", () => {
    const liked = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(liked));
    button.textContent = liked ? "Đã thích" : "Thích";
  });
});

headerBuy.addEventListener("click", () => {
  const headerHeight = offer.getBoundingClientRect().height;
  headerBuy.href = firstOrder.getBoundingClientRect().bottom >= headerHeight ? "#chon-chan" : "#dat-hang";
});
