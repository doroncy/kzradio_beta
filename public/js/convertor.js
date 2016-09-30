/*global _, moment, models */
"use strict";

var old_channel;
var temp_channel;
var new_channel;

temp_channel.title = old_channel.post_title;
temp_channel.start_time = old_channel["channel-start-datetime"].substr(1);
temp_channel.end_time = old_channel["channel-end-time"];

var weekday = Math.parseInt(old_channel["channel-start-datetime"].substr(0, 1));
var weekdays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

temp_channel.weekday = weekdays[weekday];
temp_channel.broadcaster = [];

_.forEach(old_channel.channel_DJs, function(broadcaster){
    var user = {
        first_name : broadcaster.first_name,
        last_name : broadcaster.last_name,
        email : broadcaster.user_email,
        type: 'broadcaster'
    };

    var db_user = new models.users(user);
    db_user.save(function(err, user){
        temp_channel.broadcaster.push(user._id);
    });
});

var db_channel =  new models.channels(temp_channel);
    db_channel.save(function(err, channel){
        new_channel = channel;
    });

_.forEach(old_channel.channels_to_shows, function(old_show){
    var show = {
        title : old_show.post_title,
        start_time : old_show["show-start-datetime"].substr(8, 10) + ':' + old_show["show-start-datetime"].substr(10),
        end_time : old_show["show-end-datetime"].substr(8, 10) + ':' + old_show["show-end-datetime"].substr(10),
        date : moment(old_show["show-start-datetime"].substr(10), "yyyyMMdd"),
        archive_url : old_show["show-archived-stream-url"],
        default_info_item: {
            text: old_show["show-description"]
        },
        broadcaster : new_channel.broadcaster,
        channel : new_channel._id
    };
    _.forEach(old_show.shows_to_items, function(item){
        var temp_item = {
            type: 'track',
            title : item.to.post_title.substr(item.post_title.indexOf(' -')),
            artist : item.to.post_title.substr(0, item.post_title.indexOf(' -'))
        };
        var hours = Math.floor(item.p2p.min / 60),
            mins = item.p2p.min % 60,
            secs = item.p2p.sec;
        var timestamp = moment(hours + ':' + mins + ':' + secs, 'h:m:ss').format('hh:mm:ss');
        var db_item = new models.infoItems(temp_item);
            db_item.save(function(err, itm){
                show.lineup.push({lineupItem : itm, timestamp: timestamp});
            });
    });
    var db_show = new models.shows(show);
    db_show.save(function(err, show){
        new_channel.broadcaster.push(show._id);
    });
});



