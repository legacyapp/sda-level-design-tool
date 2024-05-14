import * as videojs from 'video.js';
import Player from "video.js/dist/types/player";
import $ from 'jquery';

class VideoConfiguration {
    ContainerId: string
    VideoPlayerOption: any;
    InitVideoSource: string;
    VideoFrameRate: number;
}

export class PlayerWrapper {
    private player: Player;
    private isPlaying: boolean;
    private videoFrameRate: number = 30;
    private videoFrameCallbacks: Array<(currentFrame: number, videoWidth: number, videoHeight: number, forceToRedraw: boolean) => void> = [];

    private setNextFrames(step_size: number) {
        // First, we need to pause the video
        this.player.pause();
        // Calculate movement distance
        const distance = (1 / this.videoFrameRate) * step_size;
        this.player.currentTime(this.player.currentTime() + distance);
    }

    private requestVideoFrameCallback(now: DOMHighResTimeStamp, metadata: any, forceToRedraw: boolean) {
        if (this.videoFrameCallbacks.length > 0) {
            const currentTime = this.player.currentTime();
            const currentFrame = Math.round(currentTime * this.videoFrameRate);
            this.videoFrameCallbacks.forEach(f => f(currentFrame, this.player.el_.clientWidth, this.player.el_.clientHeight, forceToRedraw));
            $("#currentTime").text(currentTime);
            $("#currentFrame").text(currentFrame);
        }

        this.player.tech_.requestVideoFrameCallback(this.requestVideoFrameCallback.bind(this));
    }

    constructor(videoConfiguration: VideoConfiguration) {
        this.player = videojs.default('my-player', videoConfiguration.VideoPlayerOption);

        videoConfiguration.InitVideoSource && this.setVideoSource(videoConfiguration.InitVideoSource);
        this.videoFrameRate = videoConfiguration.VideoFrameRate;

        const sefl = this;
        this.player.ready(function () {
            // not all browsers supports requestVideoFrameCallback
            // we should use Chrome now
            if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
                sefl.player.tech_.requestVideoFrameCallback(sefl.requestVideoFrameCallback.bind(sefl));
            }

            // play or pause video when click play button
            $('#playVideo').on("click", function () {
                if (sefl.isPlaying) {
                    sefl.player.pause();
                    $("#playVideoIcon").removeClass("hidden");
                    $("#pauseVideoIcon").addClass("hidden");
                    const currentTime = sefl.player.currentTime();
                    const currentFrame = Math.round(currentTime * sefl.videoFrameRate);
                    $("#currentTime").text(currentTime);
                    $("#currentFrame").text(currentFrame);
                } else {
                    sefl.player.play();
                    $("#playVideoIcon").addClass("hidden");
                    $("#pauseVideoIcon").removeClass("hidden");
                }
            });

            $('#nextFrame').on("click", sefl.setNextFrames.bind(sefl, 1));
            $('#previousFrame').on("click", sefl.setNextFrames.bind(sefl, -1));
            $('#nextXFrame').on("click", sefl.setNextFrames.bind(sefl, 5));
            $('#previousXFrame').on("click", sefl.setNextFrames.bind(sefl, -5));
        });

        this.player.on(['waiting', 'pause'], () => sefl.isPlaying = false);
        this.player.on('playing', () => sefl.isPlaying = true);
    }

    setVideoSource(videoSource: string) {
        videoSource && this.player.src({ type: 'video/mp4', src: videoSource });
    }

    setVideoFrameCallback(func: (now: DOMHighResTimeStamp, metadata: any) => void) {
        this.videoFrameCallbacks.push(func);
    }

    setCurrentFrame(currentFrame: number) {
        let currentTime = currentFrame / this.videoFrameRate;
        currentTime = parseFloat(currentTime.toFixed(6));

        if (currentTime !== this.player.currentTime()) {
            this.player.currentTime(currentTime);
        } else {
            this.requestVideoFrameCallback(null, null, true);
        }

    }

    getCurrentFrameAndTime(): [number, number] {
        const currentTime = this.player.currentTime();
        const currentFrame = Math.round(currentTime * this.videoFrameRate);

        return [currentFrame, currentTime]
    }

    getContainerSize() {
        return {
            width: this.player.el_.clientWidth,
            height: this.player.el_.clientHeight
        }
    }

    pause() {
        this.player.pause();
    }
}