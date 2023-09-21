document.addEventListener("DOMContentLoaded", function () {
    const spin_btn = document.querySelector("#spinButton-sectionId");
    const listContainer = document.querySelector(".list-sectionId");
    const listItems = listContainer.querySelectorAll("li");
    const totalItems = listItems.length;
    let totalPrice = 0; 
    let itemHeight = 200;
    let actualProductPrice = 2000
    if (window.innerWidth < 768) {
        itemHeight = 100;
    }
    if (spin_btn) {
      spin_btn.addEventListener("click", function (e) {
        const slots = document.querySelectorAll(".slot-sectionId");
        let indices = Array.from({ length: totalItems }, (_, i) => i);
  
        slots.forEach(slot => {
          const list = slot.querySelector(".list-sectionId");
          const randomIndex = Math.floor(Math.random() * indices.length);
          const chosenIndex = indices[randomIndex];
          indices = indices.filter((_, i) => i !== randomIndex);
  
          const offset = -chosenIndex * itemHeight;
          list.style.top = `${offset}px`;
  
          list.addEventListener("transitionend", () => {
            const activeItem = list.children[chosenIndex];
            const previousActiveItem = slot.querySelector(".activeProduct-sectionId");
            if (previousActiveItem) {
              previousActiveItem.classList.remove("activeProduct-sectionId");
              previousActiveItem.classList.remove("activeJackpotProduct");
            }
            activeItem.classList.add("activeProduct-sectionId");
            activeItem.classList.add("activeJackpotProduct");
            totalPrice = 0;
            const items = document.querySelectorAll(".activeProduct-sectionId .slot-item-price-sectionId[data-price]");
            items.forEach(function (element) {
              const price = parseFloat(element.getAttribute("data-price"));
              if (!isNaN(price)) {
                totalPrice += price;
              }
            });
            const slotComparePrice = document.querySelector("#slot-compare-price-sectionId");
            if (slotComparePrice) {
              slotComparePrice.textContent = `₹${totalPrice}`;
            }
            const normalPrice = document.querySelector(".normalPrice-sectionId");
            if (normalPrice) {
              if (actualProductPrice > totalPrice) {
                normalPrice.textContent = '';
                slotComparePrice.textContent = '';
                normalPrice.style.display = 'none';
              } else {
                normalPrice.style.display = 'block';
              }
            }
            const saveAmt = totalPrice - actualProductPrice;
            const discountPercentage = (totalPrice - actualProductPrice) / totalPrice;
            const finalDiscountPercentage = discountPercentage * 100;
            const slotSaveAmt = document.querySelector("#slot-save-amt-sectionId");
            if (slotSaveAmt) {
              slotSaveAmt.textContent = `🥳 You Save : ₹${saveAmt} (${Math.ceil(finalDiscountPercentage)}% Off) 🥳`;
            }
          }, { once: true });
        });
      });
    }
  });
  










//   button click
document.body.addEventListener("touchstart", function(event) {
    if (event.target.id === "spinButton-sectionId") {
        document.querySelector("#spin-up-sectionId").style.display = "none";
        document.querySelector("#spin-down-sectionId").style.display = "block";
    }
});

document.body.addEventListener("touchend", function(event) {
    if (event.target.id === "spinButton-sectionId") {
        document.querySelector("#spin-down-sectionId").style.display = "none";
        document.querySelector("#spin-up-sectionId").style.display = "block";
    }
});

document.body.addEventListener("mousedown", function(event) {
    if (event.target.id === "spinButton-sectionId") {
        document.querySelector("#spin-up-sectionId").style.display = "none";
        document.querySelector("#spin-down-sectionId").style.display = "block";
    }
});

document.body.addEventListener("mouseup", function(event) {
    if (event.target.id === "spinButton-sectionId") {
        document.querySelector("#spin-down-sectionId").style.display = "none";
        document.querySelector("#spin-up-sectionId").style.display = "block";
    }
});
