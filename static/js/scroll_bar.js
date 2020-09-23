"use strict";

exports.initialize = function () {};

exports.set_layout_width = function () {
    // This logic unfortunately leads to a flash of mispositioned
    // content when reloading a Zulip browser window.  More details
    // are available in the comments on the max-width of 1400px in
    // the .app-main CSS rules.
    if (page_params.fluid_layout_width) {
        $(".header-main").css("max-width", "inherit");
        $(".app-main").css("max-width", "inherit");
        $("#compose-container").css("max-width", "inherit");
    } else {
        $(".header-main").css("max-width", "1400px");
        $(".app-main").css("max-width", "1400px");
        $("#compose-container").css("max-width", "1400px");
    }
};

window.scroll_bar = exports;
