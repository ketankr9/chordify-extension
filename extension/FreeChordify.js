// ==UserScript==
// @name         Free-Chordify
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  try to take over the world!
// @author       You
// @match        *://chordify.net/*
// @grant        none
// ==/UserScript==
/* jshint -W097 */
'use strict';

//debugger

// no Premium Adbanner on top and 'background' fullscreen banner
$("#mm,#premiumOverlay,#div-gpt-ad-1544191679752-0")
    .remove()

$(".premium-demo-title")
    .remove()

// no FB,Twitter-buttons,...
 $(".sharing")
     .remove()

//We don't buy, we download !
//http://stream-recorder.com/forum/record-capture-download-rip-save-music-deezer-t2023p19.html
// $(".action-buy")
//     .remove()

// $("#fb-root")
//     .remove()

//No Subscribe to Chordify Premium to enable printing.
// $("style[media]")
//     .remove()

// removes media= "screen,print" seperation
// $("[media]")
// .removeAttr("media")

// You like Chordify? ..blah
$(".service-value,.sharing-footer")
.remove()

// add replaceClass() to JQuery
$.fn.replaceClass = function (pFromClass, pToClass) {
    return this.removeClass(pFromClass).addClass(pToClass);
};

// Unlock Bar
$("body")
    .replaceClass('user-free', 'user-premium')



$('#freeCss')
    .replaceWith(
    '<link rel="stylesheet" href="//dakj3r0k8hnld.cloudfront.net/css/print.css" type="text/css" media="print" />'+
    '<script src="//dakj3r0k8hnld.cloudfront.net/js-bundles/midi-lgc-bundle.js" type="text/javascript" defer></script>'    ) // ?1551715674


//$('head').append( '<script src="/js/subscriptions.js?h=06be275a9f991897fad0e596897acc49&song=youtube:E1PfIX-GQPk" type="text/javascript" defer></script>')


///////////////////////////////////////////////////
// Paste of https://chordify.net/js/subscriptions.js
//
// needed because links expires / 'h=' parameter is changing
// Attention some additional 'var' are sometimes necessary since this scripts uses 'use strict'


// Original
if(window.Chordify === undefined) {
	window.Chordify = {};
}

Chordify.transpose = 0;
Chordify.capo = { setting: 0 };
Chordify.audioMuted = false;
Chordify.speed = 0;

// The transposed chord handle, e.g. for MIDI playback
Chord.prototype.getSoundHandle = function(){
	return this.compensateHandle(Chordify.transpose);
}
// The root that should be displayed, i.e. taking into account accidental, transpose and capo settings
Chord.prototype.getViewHandle = function(){
	return this.compensateHandle(Chordify.transpose - Chordify.capo.setting);
}
Chord.prototype.compensateHandle = function(offset){
	if( this.isRest() ) return 'N';

	var root = Chordify.shiftRoot(this.handleParts.root, offset),
		extension = this.handleParts.extension,
		bassNote = '';
	if( Chordify.song.chordLevel == 'simple' ){
		extension = Chordify.song.simpleChords[this.idx].extension;
	} else if( this.handleParts.bassNote != '' ){
		bassNote = '/' + Chordify.shiftRoot(this.handleParts.bassNote, offset);
	}
	return root + ':' + extension + bassNote;
}

// Transpose the song up or down the given number of steps
Song.prototype.transpose = function(steps){

	var value = wrap(Chordify.transpose + steps, -5, 6);
	Chordify.transpose = value;
	// transpose to new root
	var newKey = this.keys[this.key.interval][wrap(this.keyMapping[this.key.interval][this.key.root] + steps, 0, 11)];
	this.key.root = newKey[0];
	this.key.accidental = newKey[1];

	if( !$('#transposeToggle').hasClass('nav-active') ){
		// On mobile, dont update chord view until after the transpose dropdown is closed
		Chordify.updateChordView();
	}

	if( Chordify.capo.el ){
		Chordify.capo.renderChordSummary();
	}
	return newKey;
};

// ukele and guitar capo hints
function Capo( el ) {
	this.el = el;
	this.setting = 0;
	this.render();
	this.bindEvents();
	// If another capo was active, take over its settings and remove the old one
	if( Chordify.capo.setting ){
		this.updateCapo(Chordify.capo.setting);
		Chordify.capo.el.empty();
	}
}
Capo.prototype.capoPositions = {
	'0': 2,
	'1': 19,
	'2': 45,
	'3': 69,
	'4': 92,
	'5': 113,
	'6': 133,
	'7': 152,
	'8': 169,
	'9': 186,
	'10': 202,
	'11': 216,
	'12': 230
}
Capo.prototype.render = function(){
	this.el.empty();
	this.$capoButton = $('.function-capo > button');
	this.$showSteps = $('.show-capo-steps');

	this.$summary = $('<div class="capo-chord-summary"></div>');
	this.$explanation = $('<div class="control-label capo-explanation">' + Lang.capo_original + '</div>');
	var $neck = $('<div class="capo-neck"></div>'),
		$reset = $('<button class="capo-reset">'+ Lang.reset +'</button>');
	this.el.append(this.$summary, this.$explanation, $neck, $reset);
	this.renderChordSummary();

	this.$theCapo = $('<span id="theCapo" style="left:2px;"></span>');
	this.$background = $('<div class="capo-background" style="left: 0px; width: 0px;"></div>');
	$neck.append(this.$theCapo, this.$background);

	if( Chordify.instrument != 'piano' ){
		this.el.addClass('capo-' + Chordify.instrument);
	}
}
Capo.prototype.bindEvents = function(){
	var me = this,
		$neck = this.el.find('.capo-neck');

	me.el.find('.capo-reset').click(function(e){
		me.updateCapo(0);
	});

	// for dragging the capo
	var positions = me.capoPositions;
	function checkMouseOnCapo(e){
		var eLocation = e.type != 'touchmove' ? e.pageX : e.originalEvent.touches[0].pageX,
		mouseX = eLocation - $neck.offset().left;
		// check for all frets if the mouse is on it
		for( var i = 1; i < Object.keys(positions).length+1; i++ ){
			var mouseThreshold = ( positions[i+1] - positions[i] ) / 2 + positions[i];
			if( mouseX <= positions[1]/2 ){
				me.updateCapo(0);
			} else if( mouseX <= mouseThreshold ){
				me.updateCapo(i);
			} else if( mouseX > positions[11] ){
				me.updateCapo(11);
			} else {
				continue;
			}
			return;
		}
	}

	var mouseDown = false;
	$neck.on('mousedown touchstart', function(e){
		if( e.which == 1 || e.which == 0 ){
			mouseDown = true;
		}
	});

	$(window).on('mousemove touchmove', function(e){
		if( mouseDown ){
			e.preventDefault();
			checkMouseOnCapo(e);
		}
		return true;
	});

	$(window).on('mouseup touchend', function(e){
		if( mouseDown ){
			checkMouseOnCapo(e);
			mouseDown = false;
		}
		return true;
	});
}
Capo.prototype.updateCapo = function(capo){
	if( capo == this.setting ) return;

	this.setting = capo;
	this.renderChordSummary();
	if( !$('#capoToggle').hasClass('nav-active') ){
		// On mobile, dont update chord view until after the capo dropdown is closed
		Chordify.updateChordView();
	}

	this.$showSteps.text('('+capo+')');
	this.$theCapo.css('left', this.capoPositions[capo] + 'px');
	this.$theCapo.toggleClass('active', capo > 0);

	var fretWidth = this.capoPositions[capo+1] - this.capoPositions[capo];
	this.$background.css({
		'left':this.capoPositions[capo] + 'px',
		'margin-left':Math.ceil(-(fretWidth/2 - 3)) + 'px',
		'width':fretWidth + 'px'
	});

	if( capo > 0 ){
		this.$capoButton.addClass('active');
		this.$explanation.html(Lang.capo_hint.replace('%d', capo));
		this.$background.show();
		this.$showSteps.show();
	} else {
		this.$capoButton.removeClass('active');
		this.$explanation.html(Lang.capo_original);
		this.$background.hide();
		this.$showSteps.hide();
	}
}
Capo.prototype.renderChordSummary = function(){
	if( this.$summary === undefined ) return;
	this.$summary.empty();
	for( c in Chordify.song.chord_summary ){
		var sChord = Chordify.song.chord_summary[c];
		var offset = Chordify.transpose - this.setting,
			r = Chordify.shiftRoot(sChord.split(':')[0], offset),
			e = ':' + sChord.split(':')[1].split('/')[0],
			b = sChord.split('/')[1] ? ('/' +
				Chordify.shiftRoot(sChord.split('/')[1]), offset) : '';

		this.$summary.append(Chordify.diagramHtml(r + e + b));
	}
}

function createChordPlayer(callback) {

	if( Chordify.chordPlayer ) return;

	Chordify.chordPlayer = {active:false,ready:false,volume:127};

	MIDI.loadPlugin({
		soundfontUrl: "/midi-js/examples/soundfont/",
		instrument: "acoustic_grand_piano",
		onprogress: function(state, progress) {
			console.log(state, progress);
		},
		onsuccess: function() {
		    $.getJSON( "/midi/notes?vocabulary=extended_inversions", function(data) {
				Chordify.chordPlayer.notes = data;
				Chordify.chordPlayer.ready = true;

				if( callback !== undefined ){
					callback();
				}
			});
		}
	});

	Chordify.chordPlayer.play = function(chordHandle){
		// Stop previous chord
		Chordify.chordPlayer.stop();

		// No chord is quiet
		if( chordHandle[0] == 'N' )	return;

		// Separate bass note
		var parts = chordHandle.split("/");
		var baseHandle = parts[0];
		var bassNote = parts.length > 1 ? parts[1] : baseHandle.split(":")[0];

		// Play the chord
		var notes = Chordify.chordPlayer.notes[baseHandle].concat(Chordify.chordPlayer.notes[bassNote]);
		MIDI.chordOn(0, notes, Chordify.chordPlayer.volume);
		Chordify.chordPlayer.prevNotes = notes;
	};

	Chordify.chordPlayer.stop = function() {
		if( Chordify.chordPlayer.prevNotes !== undefined ){
			MIDI.chordOff(0, Chordify.chordPlayer.prevNotes, 0);
			Chordify.chordPlayer.prevNotes = undefined;
		}
	};
	// on pause of video pause chord playback too
	Chordify.player.on('pause', function() {
		Chordify.chordPlayer.stop();
	});

	Chordify.chordPlayer.setVolume = function(volume) {
		Chordify.chordPlayer.volume = Math.round(volume*127);
	};

}

if( window.HtmlPlayer !== undefined ){
	// can be overridden in other js files to be notified about chord changes during playback
	if( HtmlPlayer.prototype.events['chordchange'] === undefined ){
		HtmlPlayer.prototype.events['chordchange'] = [];
	}

	HtmlPlayer.prototype.events['chordchange'].push(function($newChord, type){
		if( Chordify.chordPlayer === undefined || !Chordify.chordPlayer.active || !Chordify.chordPlayer.ready || $newChord.data('handle') == 'n' ) return;

		if( type === undefined && $newChord.hasClass('nolabel') ) return; // just regular pulses from playerchord not visible: no playback. other types are click and loop.

		Chordify.chordPlayer.play(Chordify.song.chords[$newChord.data('i')].getSoundHandle());
	});

	//extend player prototype with speed functionality


	HtmlPlayer.prototype.speed = 0;
	HtmlPlayer.prototype.speeds = {'-5': 0.5, '-4': 0.6, '-3': 0.7, '-2': 0.8, '-1': 0.9, '0': 1, '1': 1.1, '2': 1.2, '3': 1.3, '4': 1.4, '5': 1.5};

	// general interface to set the speed
	HtmlPlayer.prototype.setSpeed = function(speed){

		var speedStr = String(speed);

		// youtube and html5 audio have a different speed implementation
		// therefore rwrite here based on the speeds array
		var internalSpeed = this.speeds[speedStr];

		if( internalSpeed == undefined ){
			return Chordify.speed;
		}

		this.speed = speedStr;

		// call the player specific speed method
		this.setSpeedInternal(internalSpeed);
		return this.speed;
	};

	HtmlPlayer.prototype.setSpeedInternal = function(speed){
		this.$el.find('audio').prop('playbackRate', speed);
	}


};

// only extend youtube player if it's included
if( window.YoutubePlayer !== undefined ){
	// youtube handles different speed values
	YoutubePlayer.prototype.speeds = {};
	YoutubePlayer.prototype.realSpeed = 1;
	YoutubePlayer.prototype.speedSupport = false;

	YoutubePlayer.prototype.setSpeedInternal = function(speed){
		this.yt.setPlaybackRate(speed);
		var me = this;
		if( this.speedCheckTimer ){
			clearTimeout(this.speedCheckTimer);
		}
		this.speedCheckTimer = setTimeout(function(){
			if( me.realSpeed == speed ){
				me.speedSupport = true;
			} else {
				var $speedControl = $('.function-speed').removeClass('active').css({opacity: 0.5});
				$speedControl.find('.icon-value').data('value', me.realSpeed).text(me.realSpeed);
				Chordify.speed = me.realSpeed;

				$speedControl.data('tooltip', Lang.speed_disabled_youtube);
			}
		}, 1000);
	}

	YoutubePlayer.prototype.events['speed'] = [function() {
		this.realSpeed = this.yt.getPlaybackRate();
	}];

	YoutubePlayer.prototype.events['play'] = [function() {
		this.action('mute', Chordify.audioMuted);
		this.setSpeed(Chordify.speed);
	}];
}


$(document).ready(function() {

	$('.function-export').on('click touchstart', function(e){
		var pseudoId = $('#song').data('pseudoid'),
			userId = $('body').data('userid'),
			$button = $(this),
			dlUrl = '/download/' + $button.attr('name').replace('-', '/') + '/' + pseudoId;

		dlUrl += '?transpose=' + Chordify.transpose;
		dlUrl += '&capo=' + Chordify.capo.setting;
		dlUrl += '&chord_language=' + Chordify.chordLang;
		dlUrl += '&vocabulary=extended_inversions';

		var editUserId = Chordify.getParameter('edit');

		if( editUserId ){
			dlUrl += '&edit=' + editUserId;
		}

		expireCookie('fileDownloaded');

		var interval = setInterval(function(){
			var cookie = getCookie('fileDownloaded');
			if( cookie == pseudoId ){
				ga('send', 'event', 'Download', $button.attr('name'), pseudoId);
				expireCookie('fileDownloaded');
				clearInterval(interval);
			} else if( cookie == 'false' ){
				showPopup('An error occurred during downloading');
				ga('send', 'event', 'Download', 'Failed:' + $button.attr('name'), pseudoId);
				expireCookie('fileDownloaded');
				clearInterval(interval);
			}
		}, 500);

		if( e.type == 'touchstart' ){
			self.location.href = dlUrl;
		} else {
			$('#dlFrame').remove();
			$('body').append('<iframe id="dlFrame" src="' + dlUrl + '" style="border:0;width:1px;height:1px;"></iframe>');
		}
	});

	// adds suport for ?download=midi / pdf / diagrams
	if( Chordify.getParameter('download') ){
		var dlTypes = Chordify.getParameter('download').split(/,/);

		for( dlType in dlTypes ){
			var $el = $('.function-export[name^="' + dlTypes[dlType] + '"]').click();
			console.log($el);
		}
	}

	var $controls = $('.controls');
	$controls.find('button[name=print]').on('click touchstart', function(){
		window.print();
	});

	$('.function-capo').on('click mousedown', function(e){
		// touch devices get this class only after this event handler is called
		var $this = $(this),
			dropdownClass = isTouch ? !$this.hasClass('nav-active') : $this.hasClass('nav-active');
		if( dropdownClass && $this.find('.capo-explanation').length < 1 ){
			ga('send', 'event', 'Feature', 'capo hint');
			Chordify.capo = new Capo($this.find('.capoHint'));
		}
	});

	var oldSettings = {};
	// Update chord view after changing the capo/transpose setting in their dropdowns
	$('#transposeToggle, #capoToggle').click(function(e){
		if( oldSettings.capo !== undefined ){ return; }
		var onDropdownClose = function(){
			// Wait for dropdown state to change
			setTimeout(function(){
				var dropdownActive = $('#transposeToggle, #capoToggle').hasClass('nav-active');
				var settingUpdate = (oldSettings.capo !== Chordify.capo.setting
									|| oldSettings.tranpose !== Chordify.transpose);

				if( !dropdownActive && settingUpdate ){
					oldSettings = {};
					Chordify.updateChordView();
					$('body').unbind('mouseup', onDropdownClose);
				}
			}, 10);
		}
		oldSettings = {capo: Chordify.capo.setting, transpose: Chordify.transpose};
		$('body').bind('mouseup', onDropdownClose)
	});

	var isIOS = $('body').hasClass('ios');
	if( isIOS ){
		createChordPlayer();
		var iOSMidiFired = false;
	}

	$('.volume-form').on('input', function(e){
		var slider = $(this).find('input')[0];
		var convertedVolume = slider.value/slider.max;
		var type = slider.name.replace('-volume','');
		changeVolume(convertedVolume, type);
	});

	// Mute/full on volume buttons in the dropdown
	$('.volume-button').on('click', function(e){
		e.preventDefault();
		var volume = $(this).hasClass('icon-audio-off') ? 0 : 1;
		var type = $(this).attr('name').replace('-volume','');
		var slider = $(this).siblings("input");
		slider.prop( 'value', volume*slider.attr('max') );
		changeVolume(volume, type);
	});

	// The volume buttons in the toolbar that toggle the dropdown menus
	$('button.volume-toggle').on('click', function() {
		var $dropdown = $(this).siblings('.dropdown-items');
		var slider = $dropdown.find('input');
		var type = slider.attr('name').replace('-volume','');
		// Fix for iPad midi playback, see https://github.com/mudcube/MIDI.js/issues/80
		if( type == 'chord' && isIOS && !iOSMidiFired ){
			Chordify.chordPlayer.active = true;
			Chordify.chordPlayer.setVolume(0);
			Chordify.chordPlayer.play('C:maj/C');
			Chordify.chordPlayer.setVolume(1);
			iOSMidiFired = true;
		}

		// touch devices update the dropdown only after this event is fired, so this part is inverted
		var dropdownActive = isTouch ? $dropdown.is(':visible') : !$dropdown.is(':visible');
		if( $(this).hasClass('active') || dropdownActive ){
			return;
		}
		slider.prop( 'value', slider.attr('max') );
		changeVolume(1, type);
	});

	// changes the volume of music/chord playback. Volume range is 0-1
	function changeVolume(volume, type) {
		// song volume
		if( type == 'music' ){
			Chordify.player.action('volume', volume);

			if( isIOS && Chordify.song.type == 'youtube' ){
				Chordify.player.action( 'mute', (volume < 0.5) );
			}
		// midi chords volume
		} else {
			if( Chordify.chordPlayer === undefined ){
				createChordPlayer();
				Chordify.chordPlayer.active = true;
			}
			Chordify.chordPlayer.setVolume(volume);
		}

		// change button icon depending on volume
		var value = volume == 0 ? false : true;
		var $button = $(".controls [name='"+ type +"-playback']");
		$button.toggleClass('active', value);
		$button.data('value', value);
		$button.find('div:first').toggleClass('icon-audio-on', value).toggleClass('icon-audio-off', !value);
	}

	// the loop function is a premium feature, the select function is not
	$('.function-loop button').on('click', function(e){

		var $loopBtn = $(this);
		$loopBtn.toggleClass('active');

		if( $loopBtn.hasClass('active') ){
            debugger
			Chordify.initLoop();
		} else {
			Chordify.removeLoop(e);
		}
	});

	// change transpose settings
	$('.function-transpose button').click(function(e){
		var direction = $(this).attr('name'),
			$transpose = $(this).closest('.function-transpose');

		if( direction == 'up' ){
			var steps = 1;
		} else if( direction == 'down' ){
			var steps = -1;
		} else if( direction == 'center' && Chordify.transpose != 0 ) {
			var steps = -Chordify.transpose;
		} else {
			return;
		}

		var value = wrap(Chordify.transpose + steps, -5, 6);
		var newKey = Chordify.song.transpose(steps);

		validateTransposeSetting($transpose);

		// Render all the key info and chords
		var label = 'label-' + newKey[0].replace('#', 's') + '_' + Chordify.song.key.interval;
		$('.show-key').removeClass().addClass('show-key ' + label);

		$('.function-transpose').toggleClass('active', value != 0);

		if( value != 0 ){
			var htmlString = value > 0 ? '(+'+value+')' : '('+value+')';
			$('.show-transpose-steps').text(htmlString);
		} else {
			$('.show-transpose-steps').text('');
		}
	});

	// change tempo settings
	$controls.find('.function-speed button').on('click', function(e) {

		var direction = $(this).attr('name'),
			$speed = $('.function-speed'),
			$valueField = $('.speed-value'),
			currentSteps = $valueField.data('value'),
			steps = 0;

		if( direction == 'up' ){
			steps = 1;
		} else if( direction == 'down' ){
			steps = -1;
		} else if( direction == 'center' && currentSteps != 0 ) {
			steps = -currentSteps;
		} else {
			return;
		}

		var value = currentSteps + steps, minValue = 0, maxValue = 0;

		// we have to check how many speeds we have

		for( var s in Chordify.player.speeds ){
			minValue = Math.min(minValue, parseInt(s, 10));
			maxValue = Math.max(maxValue, parseInt(s, 10));
		}
		if( value > maxValue || value < minValue ){
			return;
		}

		$speed.toggleClass('active', value != 0);
		$valueField.data('value', value);

		var speed = Chordify.player.speeds[value];
		var speedPercentage = Math.round(speed*100)+'%';
		$valueField.html( speedPercentage );
		if( Chordify.song.derived_bpm != undefined ){
			// Round the bpm to a whole number
			var htmlString = Math.round(speed*Chordify.song.derived_bpm).toString() + ' bpm';
			$('.show-bpm').html(htmlString);
		}

		if( Chordify.player.isReady ){
			Chordify.speed = Chordify.player.setSpeed(value);
		}
	});

	// Shows a message about the tranpose setting
	function validateTransposeSetting($el) {
		if(!Chordify.audioMuted && Chordify.transpose != 0) {
			if( $el.hasClass('dropdown-screen') ){
				$el.find('.control-label').text(Lang.transpose_pitch);
			} else if($('.tooltip').data('sticky')) {
				return;
			} else {
				setTimeout(function() {
					var oldTooltip = $el.data('tooltip');
					tooltip($el.data('tooltip', Lang.transpose_pitch), true);
					// set old tooltip text back
					$el.data('tooltip', oldTooltip);
				}, 300);
			}
		} else {
			if( $el.hasClass('dropdown-screen') ){
				var $label = $el.find('.control-label');
				$label.text($label.data('defaulttext'));
			} else {
				$el.data('has-sticky-tooltip', false);
				$('.tooltip[data-sticky="true"]').remove();
			}
		}
	}

});
