"use strict";

const {strict: assert} = require("assert");

const _ = require("lodash");

const {set_global, zrequire, stub_class_methods} = require("../zjsunit/namespace");
const {run_test} = require("../zjsunit/test");
const {make_zjquery} = require("../zjsunit/zjquery");

set_global("$", make_zjquery());
set_global("document", "document-stub");

const noop = function () {};
window.addEventListener = noop;
$.now = noop;

const people = zrequire("people");
const message_list_data_cache = zrequire("message_list_data_cache");
const mld_cache = message_list_data_cache.mld_cache;
const {set_up, cache_fixtures} = require("./lib/events");

zrequire("echo");
zrequire("unread");
zrequire("muting");
zrequire("narrow");
zrequire("narrow_state");
zrequire("compose_state");
zrequire("hash_util");
zrequire("stream_data");
zrequire("Filter", "js/filter");
zrequire("FetchStatus", "js/fetch_status");
zrequire("MessageListData", "js/message_list_data");
zrequire("MessageListView", "js/message_list_view");
zrequire("message_list");
zrequire("message_util");
zrequire("message_fetch");
zrequire("message_store");
zrequire("message_events");
zrequire("sent_messages");
zrequire("server_events");
zrequire("server_events_dispatch");

const _all_message_lists = () => [];
const _home_msg_list = new message_list.MessageList({
    muting_enabled: false,
});
const _current_msg_list = {
    can_mark_messages_read: () => true,
    selected_id: () => 100,
    selected_row: noop,
};

set_global("page_params", {});
set_global("channel", {get: noop});
set_global("ui_util", {change_tab_to: noop});
set_global("hashchange", {save_narrow: noop});
set_global("compose_actions", {on_narrow: noop});
set_global("alert_words", {process_message: noop});
set_global("floating_recipient_bar", {hide: noop});
set_global("message_view_header", {initialize: noop});
set_global("unread_ui", {update_unread_counts: noop});
set_global("search", {update_button_visibility: noop});
set_global("pm_list", {update_private_messages: noop});
set_global("condense", {un_cache_message_content_height: noop});
set_global("top_left_corner", {handle_narrow_activated: noop});
set_global("typing_events", {render_notifications_for_narrow: noop});
set_global("compose", {update_closed_compose_buttons_for_stream: noop});
set_global("recent_topics", {
    update_topics_of_deleted_message_ids: noop,
    process_messages: noop,
    process_topic_edit: noop,
});
set_global("resize", {
    resize_stream_filters_container: noop,
    resize_page_components: noop,
});
set_global("loading", {
    make_indicator: noop,
    destroy_indicator: noop,
});
set_global("stream_list", {
    handle_narrow_activated: noop,
    update_streams_sidebar: noop,
});
set_global("stream_topic_history", {
    add_message: noop,
    remove_messages: noop,
});
set_global("recent_senders", {
    process_topic_edit: noop,
    process_message_for_senders: noop,
    update_topics_of_deleted_message_ids: noop,
});
set_global("unread_ops", {
    process_visible: noop,
    process_read_messages_event: noop,
});
set_global("notifications", {
    clear_compose_notifications: noop,
    redraw_title: noop,
    received_messages: noop,
});
set_global("message_scroll", {
    hide_top_of_narrow_notices: noop,
    show_loading_older: noop,
    hide_indicators: noop,
});
set_global("home_msg_list", _home_msg_list);
set_global("current_msg_list", _current_msg_list);
set_global("all_message_lists", _all_message_lists);

stub_class_methods("MessageListView", {
    rerender_preserving_scrolltop: noop,
    clear_table: noop,
    get_row: () => [],
});
narrow.save_pre_narrow_offset_for_reload = noop;

const {alice, mark} = set_up.users;
const {denmark, usa} = set_up.streams;
const {operators_list_1, operators_list_2} = set_up.operators_list;
const {all_messages_1, all_messages_2} = set_up.all_messages;

const all_people = [alice, mark];
for (const person of all_people) {
    people.add_active_user(person);
}
const subs = [denmark, usa];
for (const sub of subs) {
    stream_data.add_sub(sub);
}

function update_message_list_all(messages) {
    message_list.all = new message_list.MessageList({
        muting_enabled: false,
    });
    message_list.all.data.fetch_status.has_found_newest = () => true;

    messages.forEach(message_store.set_message_booleans);
    messages = messages.map(message_store.add_message_metadata);
    message_list.all.add_messages(messages);
}

function generate_mld_cache(raw_operators_list) {
    mld_cache.empty();
    // This function builds the mld_cache and
    // populates each mld object's messages.
    for (const raw_operators of raw_operators_list) {
        narrow.activate(raw_operators, {});
    }
}

function verify_mld_cache(expected_mld_cache) {
    function get_ids_from_mld(key) {
        return mld_cache
            ._get_by_key(key)
            .all_messages()
            .map((msg) => msg.id);
    }

    for (const key of mld_cache.keys()) {
        const actual_msg_ids = get_ids_from_mld(key);
        assert.deepEqual(actual_msg_ids, expected_mld_cache[key]);
    }
    assert.equal(mld_cache.keys().length, _.size(expected_mld_cache));
}

server_events.home_view_loaded();

run_test("delete_messages", () => {
    update_message_list_all(all_messages_1);
    generate_mld_cache(operators_list_1);

    let expected_mld_cache = {
        "#narrow/stream/101-Denmark/topic/Copenhagen": [100],
        "#narrow/stream/101-Denmark/topic/Aarhus": [101, 102],
        "#narrow/stream/101-Denmark": [100, 101, 102],
    };
    verify_mld_cache(expected_mld_cache);

    // Delete msg={id: 101}
    let event = cache_fixtures.delete_messages_1;
    server_events._get_events_success([event]);

    expected_mld_cache = {
        "#narrow/stream/101-Denmark/topic/Copenhagen": [100],
        "#narrow/stream/101-Denmark/topic/Aarhus": [102],
        "#narrow/stream/101-Denmark": [100, 102],
    };
    verify_mld_cache(expected_mld_cache);

    // Delete msg={id: 102}
    event = cache_fixtures.delete_messages_2;
    server_events._get_events_success([event]);

    // Topic Aarhus gets deleted from MLDCache as it is now empty.
    expected_mld_cache = {
        "#narrow/stream/101-Denmark/topic/Copenhagen": [100],
        "#narrow/stream/101-Denmark": [100],
    };
    verify_mld_cache(expected_mld_cache);
});

run_test("add_messages", () => {
    update_message_list_all(all_messages_1);
    generate_mld_cache(operators_list_1);

    let expected_mld_cache = {
        "#narrow/stream/101-Denmark/topic/Copenhagen": [100],
        "#narrow/stream/101-Denmark/topic/Aarhus": [101, 102],
        "#narrow/stream/101-Denmark": [100, 101, 102],
    };
    verify_mld_cache(expected_mld_cache);

    // Insert new msg={id: 103, topic: Copenhagen}
    const event = cache_fixtures.add_messages;
    server_events._get_events_success([event]);

    expected_mld_cache = {
        "#narrow/stream/101-Denmark/topic/Copenhagen": [100, 103],
        "#narrow/stream/101-Denmark/topic/Aarhus": [101, 102],
        "#narrow/stream/101-Denmark": [100, 101, 102, 103],
    };
    verify_mld_cache(expected_mld_cache);
});

run_test("update_messages", () => {
    update_message_list_all(all_messages_2);
    generate_mld_cache(operators_list_2);

    let expected_mld_cache = {
        "#narrow/stream/101-Denmark/topic/Copenhagen": [100],
        "#narrow/stream/101-Denmark/topic/Aarhus": [101, 102],
        "#narrow/stream/101-Denmark": [100, 101, 102],
        "#narrow/stream/201-USA/topic/California": [202],
        "#narrow/stream/201-USA/topic/Florida": [200, 201],
        "#narrow/stream/201-USA": [200, 201, 202],
    };
    verify_mld_cache(expected_mld_cache);

    // Update content of msg={id: 103}
    let event = cache_fixtures.update_message_1;
    assert.equal(message_store.get(event.message_id).content, event.orig_content);
    server_events._get_events_success([event]);

    verify_mld_cache(expected_mld_cache);
    assert.equal(message_store.get(event.message_id).raw_content, event.content);

    // Rename topic Aarhus to Copenhagen
    event = cache_fixtures.update_message_2;
    server_events._get_events_success([event]);

    expected_mld_cache = {
        "#narrow/stream/101-Denmark/topic/Copenhagen": [100, 101, 102],
        "#narrow/stream/101-Denmark": [100, 101, 102],
        "#narrow/stream/201-USA/topic/California": [202],
        "#narrow/stream/201-USA/topic/Florida": [200, 201],
        "#narrow/stream/201-USA": [200, 201, 202],
    };
    verify_mld_cache(expected_mld_cache);

    // Move all messages in from USA/Florida to Denmark/Copenhagen
    event = cache_fixtures.update_message_3;
    server_events._get_events_success([event]);

    expected_mld_cache = {
        "#narrow/stream/101-Denmark/topic/Copenhagen": [100, 101, 102, 200, 201],
        "#narrow/stream/101-Denmark": [100, 101, 102, 200, 201],
        "#narrow/stream/201-USA/topic/California": [202],
        "#narrow/stream/201-USA": [202],
    };
    verify_mld_cache(expected_mld_cache);
});
