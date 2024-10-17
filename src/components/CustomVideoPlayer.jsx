import React, { useState, useEffect } from 'react';
import '../style/CustomVideoPlayer.css';

const CustomVideoPlayer = ({ videoRef }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);


  let currentStyle;
  if (videoRef.current) {
    currentStyle = window.getComputedStyle(videoRef.current).display;
    
  }
  else{
    currentStyle='none'
  }
  // Play or Pause the video
//   console.log(videoRef.current)
  const togglePlayPause = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Mute or Unmute the video
  const toggleMute = () => {
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Update the volume
  const handleVolumeChange = (e) => {
    const newVolume = e.target.value;
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
  };

  // Seek video
  const handleSeek = (e) => {
    const newTime = (e.target.value / 100) * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Update progress bar as video plays
  const handleTimeUpdate = () => {
    const current = videoRef.current.currentTime;
    const progressPercentage = (current / videoRef.current.duration) * 100;
    setProgress(progressPercentage);
    setCurrentTime(current);
  };

  // Update the video's duration when loaded
  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      videoRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Format time for display (MM:SS)
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Use useEffect to attach event listeners to the videoRef
  useEffect(() => {
    const videoElement = videoRef.current;
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoRef]);

  return (
<div className="video-overlay" style={currentStyle==="none"?{display:"none"}:{width:videoRef.current.offsetWidth, borderBottomRightRadius:"5px", borderBottomLeftRadius:"5px"}}>
      {/* Custom Overlay Controls */}
      <div className="custom-controls">
        {/* Play/Pause Button */}
        <button onClick={togglePlayPause} className="control-btn">
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        {/* Mute Button */}
        <button onClick={toggleMute} className="control-btn">
          {isMuted ? 'Unmute' : 'Mute'}
        </button>

        {/* Volume Control */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="volume-bar"
        />

        {/* Seek Bar */}
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSeek}
          className="seek-bar"
        />

        {/* Time Display */}
        <span className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Fullscreen Button */}
        <button onClick={toggleFullscreen} className="control-btn">
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>
    </div>
  );
};

export default CustomVideoPlayer;
