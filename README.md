# moody-blues

moody-blues is a JavaScript library for HLS player powered by [hls.js](https://github.com/video-dev/hls.js).  
It has the following features.

- Playlist support
- Native playback support
- Easy media operation

## Installation

```sh
npm install moody-blues
```

## Usage

```html
<video id="hls-player" />
```

```js
const video = document.getElementById('hls-player')
const player = new MoodyBlues(video, {
  debug: true,
  clips: [{
    source: 'https://example.com/playlist.m3u8',
    start: 10,
    live: false
  }]
})
```

## Media operations

There are the following methods for operating media.

| Operation         | Description                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `play(clips)`     | Play one or more clips.<br>If there is more than one, specify an array of clip objects.                           |
| `addClips(clips)` | Add one or more clips to the end of the playlist.<br>If there is more than one, specify an array of clip objects. |
| `resume()`        | Resume playback.                                                                                                  |
| `pause()`         | Pauses playback.                                                                                                  |
| `seek(time)`      | Seek to the specified number of seconds.                                                                          |
| `volume(level)`   | Changes the volume to the specified value.<br>level is a value between 0 and 1.                                   |
| `mute(muted)`     | Change the muted state.<br>muted is a boolean value.                                                              |
| `speed(rate)`     | Change the playback speed.                                                                                        |

### Clip object

The clip object has the following properties:

| Property | Type   | Required | Description                                      |
| -------- | ------ | -------- | ------------------------------------------------ |
| `source`   | String | x | Specify the HLS source URL.                      |
| `start`    | Number |   | Specify the number of seconds to start playback. |

You can also add arbitrary properties.

## Options

Configration parameters could be provided upon instantiation of `MoodyBlues` object.

| Option                      | Type                                                                                        | Default     | Description                             |
| --------------------------- | ------------------------------------------------------------------------------------------- | ----------- | --------------------------------------- |
| `debug`                     | `boolean`                                                                                     | `false`     | Outputs MoodyBlues logs to the console. |
| `useNativeWheneverPossible` | `boolean`                                                                                     | `false`     | Use native HLS playback if possible.    |
| `clips`                      | Clip object, Array of clip object                                                                                 | `undefined` | Play the specified clip when ready.     |
| `hlsConfig`                 | [hlsConfig object](https://github.com/video-dev/hls.js/blob/master/docs/API.md#fine-tuning) | `undefined` | hls.js configration                     |

## Events

MoodyBlues fires a bunch of events, that could be registered and unregistered as below:

```js
const onProgress = (time) => {
  console.log(time)
}

// subscribe event
player.on(MoodyBlues.Events.Progress, onProgress)
// unsubscribe event
player.off(MoodyBlues.Events.Progress, onProgress)
// subscribe for a single event call only
player.once(MoodyBlues.Events.Progress, onProgress)
```

| Event                        | Data                                                                                | Description                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `MoodyBlues.Events.Finish`   |                                                                                     | Sent when playback completes.                                                                             |
| `MoodyBlues.Events.Ready`    |                                                                                     | The media's metadata has finished loading.                                                                |
| `MoodyBlues.Events.Pause`    |                                                                                     | Sent when the playback state is changed to paused.                                                        |
| `MoodyBlues.Events.Resume`   |                                                                                     | Sent when the playback state is no longer paused.                                                         |
| `MoodyBlues.Events.Buffer`   | `ranges`: [TimeRanges](https://developer.mozilla.org/en-US/docs/Web/API/TimeRanges) | Sent periodically to inform interested parties of progress downloading the media.                         |
| `MoodyBlues.Events.Speed`    | `rate: number`                                                                      | Sent when the playback speed changes.                                                                     |
| `MoodyBlues.Events.Seek`     | `time: number`                                                                      | Sent when a seek operation completes.                                                                     |
| `MoodyBlues.Events.Progress` | `time: number`                                                                      | The time indicated by the element's currentTime attribute has changed.                                    |
| `MoodyBlues.Events.Volume`   | `{ volume: number, muted: boolean }`                                                | Sent when the audio volume changes (both when the volume is set and when the muted attribute is changed). |
| `MoodyBlues.Events.Error`    | `{ type: MoodyBlues.EventTypes, details: string | undefined, fatal: boolean }`                      | Sent when an error occurs.                                                                                |

### Errors

Each error is categorized by:

- type:
  - `MoodyBlues.ErrorTypes.NetworkError` for network related errors
  - `MoodyBlues.ErrorTypes.MediaError` for media/video related errors
  - `MoodyBlues.ErrorTypes.OtherError` for all other errors
- details:
  - errors details
