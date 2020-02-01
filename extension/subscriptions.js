if(window.Chordify === undefined) {
	window.Chordify = new ChordifyLibrary();
}

function wrap(value, min, max){
	var range = max - min +1;

	value = ((value - min) % range);

	if( value < 0 ){
		return max + 1 + value;
	}

	return min + value;
}

Chordify.transpose = 0;
Chordify.capo = { setting: 0 };
Chordify.audioMuted = false;
Chordify.speed = 0;

if( window.ChordifyChord !== undefined ){
	// The transposed chord handle, e.g. for MIDI playback
	ChordifyChord.prototype.getSoundHandle = function(){
		return this.compensateHandle(Chordify.transpose);
	}
	// The root that should be displayed, i.e. taking into account accidental, transpose and capo settings
	ChordifyChord.prototype.getViewHandle = function(){
		return this.compensateHandle(Chordify.transpose - Chordify.capo.setting);
	}
	ChordifyChord.prototype.compensateHandle = function(offset){
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
	ChordifySong.prototype.transpose = function(steps){
		var value = wrap(Chordify.transpose + steps, -5, 6);
		Chordify.transpose = value;
		// transpose to new root
		var newKey = this.keys[this.key.interval][wrap(this.keyMapping[this.key.interval][this.key.root] + steps, 0, 11)];
		this.key.root = newKey[0];
		this.key.accidental = newKey[1];

		Chordify.updateChordView();

		return newKey;
	};
}

// ukele and guitar capo hints
function Capo() {
	this.setting = 0;
	// If another capo was active, take over its settings and remove the old one
	if( Chordify.capo.setting ){
		this.updateCapo(Chordify.capo.setting);
	}
}
Capo.prototype.updateCapo = function(capo){
	if( capo == this.setting ) return;

	this.setting = capo;
	this.renderChordSummary();
	Chordify.updateChordView();
}
Capo.prototype.renderChordSummary = function(){
	var chords = []
	for( c in Chordify.song.chord_summary ){
		var sChord = Chordify.song.chord_summary[c];
		var offset = Chordify.transpose - this.setting,
			r = Chordify.shiftRoot(sChord.split(':')[0], offset),
			e = ':' + sChord.split(':')[1].split('/')[0],
			b = sChord.split('/')[1] ? ('/' + Chordify.shiftRoot(sChord.split('/')[1]), offset) : '';
		chords = chords.concat([r + e + b])
	}
	this.chords = chords
}

function createChordPlayer(callback) {
	if( Chordify.chordPlayer ) return;

	Chordify.chordPlayer = { active:false, ready:false, volume:127 };

	MIDI.loadPlugin({
		soundfontUrl: '/midi-js/examples/soundfont/',
		instrument: 'acoustic_grand_piano',
		onprogress: function(state, progress) {
			console.log(state, progress);
		},
		onsuccess: function() {
			$.getJSON( '/midi/notes?vocabulary=extended_inversions', function(data) {
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
		Chordify.chordPlayer.volume = Math.round(volume * 127);
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

	HtmlPlayer.prototype.speeds = {'-5': 0.5, '-4': 0.6, '-3': 0.7, '-2': 0.8, '-1': 0.9, '0': 1, '1': 1.1, '2': 1.2, '3': 1.3, '4': 1.4, '5': 1.5};
	HtmlPlayer.prototype.setSpeedInternal = function(speed){
		this.$el.find('audio').prop('playbackRate', speed);
	}
}
/*
	extend player prototype with speed functionality
*/
if( window.ChordifyPlayer !== undefined ){
	ChordifyPlayer.prototype.createLoopOptions = function($chord){
		var $loopOptions = $(
			'<div class="loop-options">' +
				'<a href="#" class="icon-delete edit-only">' +
				'<a href="#copy" class="loop-copy edit-only">' + Lang.copy + '</a>' +
				'<a href="#remove" class="icon-close"></a>' +
			'</div>'
		).appendTo($chord);

		var prevChord = Chordify.song.chords[$chord.data('i') - 1];
		var firstOnRow = prevChord === undefined || prevChord.isLastOnRow();
		// prevent falloff left
		if( Chordify.mode == 'edit' && firstOnRow ){
			$loopOptions.css({right: 'auto', left: 0});
		}
	}

	ChordifyPlayer.prototype.speed = 0;

	// general interface to set the speed
	ChordifyPlayer.prototype.setSpeed = function(speed){
		var speedStr = String(speed);

		// youtube and html5 audio have a different speed implementation
		// therefore rwrite here based on the speeds array
		var internalSpeed = this.speeds[speedStr];

		if( internalSpeed == undefined ){
			return Chordify.speed;
		}

		this.speed = speedStr;

		// call the player specific speed method
		this.player.setSpeedInternal(internalSpeed);
		return this.speed;
	};
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
		Chordify.player.action('mute', Chordify.audioMuted);
		Chordify.player.setSpeed(Chordify.speed);
	}];
}

$(document).ready(function() {

	// Chordify Library™
	// Type: 'midi-fixed-tempo' | 'midi-time-aligned' | 'pdf' | 'print'
	Chordify.export = function(type) {
		if( type == 'print' ){
			return window.print();
		}

		var pseudoId = $('#song').data('pseudoid'),
				userId = $('body').data('userid');

		var dlUrl = '/download/' + type.replace('-', '/') + '/' + pseudoId;
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
				ga('send', 'event', 'Download', type, pseudoId);
				expireCookie('fileDownloaded');
				clearInterval(interval);
			} else if( cookie == 'false' ){
				showPopup('An error occurred during downloading');
				ga('send', 'event', 'Download', 'Failed:' + type, pseudoId);
				expireCookie('fileDownloaded');
				clearInterval(interval);
			}
		}, 500);

		$('#dlFrame').remove();
		$('body').append('<iframe id="dlFrame" src="' + dlUrl + '" style="border:0;width:1px;height:1px;"></iframe>');
	};

	// adds suport for ?download=midi / pdf / diagrams
	if( Chordify.getParameter('download') ){
		var dlTypes = Chordify.getParameter('download').split(/,/);

		for( dlType in dlTypes ){
			Chordify.export(dlType);
		}
	}

	// Chordify Library™
	Chordify.changeCapo = function(capo) {
		if( !Chordify.capo.updateCapo ){
			Chordify.capo = new Capo();
		}
		Chordify.capo.updateCapo(capo);
		Chordify.dispatchEvent({ capo: capo });
	}

	var isIOS = $('body').hasClass('ios'),
			iOSMidiFired = false;

	if( isIOS ){
		createChordPlayer();

		// Fix for iPad midi playback, see https://github.com/mudcube/MIDI.js/issues/80
		$('#song button').on('click', function() {
			if( iOSMidiFired ){ return }

			Chordify.chordPlayer.active = true;
			Chordify.chordPlayer.setVolume(0);
			Chordify.chordPlayer.play('C:maj/C');
			iOSMidiFired = true;
		})
	}

	// Chordify Library™
	// changes the volume of music/chord playback. Volume range is 0-1
	Chordify.changeVolume = function(volume, type) {
		// song volume
		if( type == 'music' ){
			Chordify.player.action('volume', volume);

			if( isIOS && Chordify.song.type == 'youtube' ){
				Chordify.player.action('mute', (volume < 0.5));
			}
		// midi chords volume
		} else {
			if( Chordify.chordPlayer === undefined ){
				createChordPlayer();
				Chordify.chordPlayer.active = true;
			}
			Chordify.chordPlayer.setVolume(volume);
		}
	}

	// change transpose settings
	// Chordify Library™
	Chordify.changeTranspose = function(direction) {
		if( direction === 0 && Chordify.transpose === 0 ){ return }

		var step = direction === 0 ? -Chordify.transpose : direction;
		var value = wrap(Chordify.transpose + step, -5, 6);
		var newKey = Chordify.song.transpose(step);
	}
	Chordify.getSongKeyHandle = function() {
		return Chordify.song.key.root.replace('#', 's') + '_'  + Chordify.song.key.interval;
	}

	// change tempo settings
	// Chordify Library™
	Chordify.changeTempo = function(direction) {
		if( direction === 0 && Chordify.speed === 0 ){ return }

		var step = direction === 0 ? -Chordify.speed : direction;
		var value = parseInt(Chordify.speed, 10) + step, minValue = 0, maxValue = 0;

		// we have to check how many speeds we have
		for( s in Chordify.player.speeds ){
			minValue = Math.min(minValue, parseInt(s, 10));
			maxValue = Math.max(maxValue, parseInt(s, 10));
		}
		if( value > maxValue || value < minValue ){
			return;
		}

		if( Chordify.player.isReady ){
			Chordify.speed = Chordify.player.setSpeed(value);
		}
	}
	Chordify.getPlayerSpeed = function() {
		return Chordify.player.speeds[Chordify.speed];
	}
	Chordify.getSongBPM = function() {
		return Math.round(Chordify.getPlayerSpeed() * Chordify.song.derived_bpm);
	}
});
