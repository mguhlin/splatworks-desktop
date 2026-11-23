const {test,expect}=require('@playwright/test');
const {supportedCaptureType,supportedRecordingType}=require('../frontend/solutions/videosplat/src/media/recording.ts');

test('desktop capture supports an MP4-only webview without changing WebM export selection',()=>{
 const original=global.MediaRecorder;
 try{
  global.MediaRecorder={isTypeSupported:type=>type==='video/mp4'};
  expect(supportedCaptureType()).toBe('video/mp4');
  global.MediaRecorder={isTypeSupported:type=>type.startsWith('video/mp4;')};
  expect(supportedCaptureType(true)).toContain('mp4a.40.2');
  expect(supportedCaptureType(false)).not.toContain('mp4a');
  expect(supportedRecordingType()).toBeUndefined();
  global.MediaRecorder={isTypeSupported:()=>false};
  expect(supportedCaptureType()).toBeUndefined();
 }finally{global.MediaRecorder=original;}
});

test('desktop capture retains WebM when its encoder is available',()=>{
 const original=global.MediaRecorder;
 try{
  global.MediaRecorder={isTypeSupported:()=>true};
  expect(supportedCaptureType(true)).toBe('video/webm;codecs=vp9,opus');
  expect(supportedCaptureType(false)).toBe('video/webm;codecs=vp9');
 }finally{global.MediaRecorder=original;}
});
