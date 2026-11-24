$(document).ready(function() {
  var connectingText = "Connecting with your phone...";
  var accentColor = typeof accent_color !== "undefined" ? accent_color : "#00ff88";
  var selectedApp = null;
  var isProcessing = false;
  var timers = [];
  var $modal = $("#app-modal-holder");
  var $process = $("#process-holder");
  var $message = $process.find(".processing-msg");
  var $progress = $process.find("#progressBarConsole div");
  var $start = $("#inject-now");

  function resetProcessing() {
    $.each(timers, function(index, timer) {
      clearTimeout(timer);
    });
    timers = [];
    isProcessing = false;
    $process.stop(true, true).hide();
    $progress.stop(true, true).css("width", "0%").text("0%");
    $message.removeClass("animated bounceIn").text(connectingText);
    $start.removeAttr("aria-disabled");
  }

  function showMessage(text) {
    $message.text(text).addClass("animated bounceIn").one(
      "webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend",
      function() {
        $(this).removeClass("animated bounceIn");
      }
    );
  }

  function schedule(callback, delay) {
    timers.push(setTimeout(callback, delay));
  }

  $(".accent-color").css("color", accentColor);
  $(".accent-bg").css("background", accentColor);

  $("#live-search").on("keyup keypress", function(event) {
    var pressedKey = event.keyCode || event.which;
    if (pressedKey === 13) {
      event.preventDefault();
      return false;
    }
  });

  // App row click handler
  $("li.app-line-grid-item").click(function(e) {
    // If the click is on an explicit link (e.g. title link or crawler link), allow native navigation
    if ($(e.target).closest("a.app-title-link, a.app-link-crawler, a.direct-link").length) {
      return;
    }

    if (
      isProcessing ||
      !$.magnificPopup ||
      !$modal.length ||
      !$process.length ||
      ($.magnificPopup.instance && $.magnificPopup.instance.isOpen)
    ) {
      return;
    }

    var $app = $(this);
    var destination = $app.attr("data-c-l-url") || "#";
    var slug = $app.attr("data-slug") || "";
    
    selectedApp = {
      url: destination,
      slug: slug,
      image: $app.find("img.app-img").attr("src"),
      title: $app.find(".app-title").text()
    };
    resetProcessing();
    $modal.find(".mockup-icon").attr("src", selectedApp.image);
    $modal.find(".title-under").text(selectedApp.title);

    // Update modal details link if slug is available
    if (slug) {
      var detailsUrl = "app/" + slug + ".html";
      $("#modal-details-link").attr("href", detailsUrl).show();
    } else {
      $("#modal-details-link").hide();
    }

    $.magnificPopup.open({
      items: { src: "#app-modal-holder" },
      type: "inline",
      preloader: false,
      mainClass: "animated slideInUp",
      closeOnContentClick: false,
      closeOnBgClick: false,
      showCloseBtn: true,
      closeBtnInside: true,
      enableEscapeKey: true,
      closeMarkup: '<button title="%title%" type="button" class="mfp-close" aria-label="Close dialog">&#215;</button>',
      fixedContentPos: true,
      fixedBgPos: true,
      callbacks: {
        close: function() {
          resetProcessing();
          selectedApp = null;
        }
      }
    });
  });

  // Start injection click -> triggers progress then launches Content Locker!
  $start.click(function() {
    if (
      isProcessing ||
      !selectedApp ||
      !$.magnificPopup ||
      !$.magnificPopup.instance.isOpen
    ) {
      return;
    }

    isProcessing = true;
    $start.attr("aria-disabled", "true");
    var appTitle = selectedApp.title;
    
    $process.stop(true, true).css("display", "flex").hide().fadeIn();
    $progress.stop(true, true).css("width", "0%").animate({ width: "100%" }, 22000);
    showMessage(connectingText);

    schedule(function() {
      showMessage("Downloading " + appTitle + ".gz");
    }, 2500);
    schedule(function() {
      showMessage("Starting injection via browser " + appTitle + ".gz");
    }, 6000);
    schedule(function() {
      showMessage("Injecting package files...");
    }, 10000);
    schedule(function() {
      $progress.text("100%");
      showMessage("Final Step: Human Verification Required.");
    }, 20000);
    schedule(function() {
      resetProcessing();
      if ($.magnificPopup && $.magnificPopup.instance && $.magnificPopup.instance.isOpen) {
        $.magnificPopup.close();
      }
      if (typeof window.openContentLocker === "function") {
        window.openContentLocker(appTitle);
      }
    }, 22000);
  });

  // Direct locker open handlers
  $(document).on("click", ".appsafe-open-locker", function(e) {
    e.preventDefault();
    var appName = $(this).attr("data-app-name") || $(this).text();
    if (typeof window.openContentLocker === "function") {
      window.openContentLocker(appName);
    }
  });
});
