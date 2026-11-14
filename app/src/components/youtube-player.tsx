import WebView from "react-native-webview";
import { applicationId } from "expo-application";
import { Copy } from "./hoop-ui";
export type PlayerProps = {
  videoId: string;
  title: string;
  onError: () => void;
  onReady: () => void;
};
/** Official IFrame API; no video downloads, autoplay, API key, or third-party player host. */
export function YouTubePlayer({ videoId, onError, onReady }: PlayerProps) {
  if (!applicationId)
    return (
      <Copy>Player unavailable in this build. Use Watch on YouTube below.</Copy>
    );
  // YouTube requires the installed app identity as the WebView referrer.
  const origin = `https://${applicationId.toLowerCase()}`;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body,#player{margin:0;width:100%;height:100%;background:#000}</style></head><body><div id="player"></div><script src="https://www.youtube.com/iframe_api"></script><script>function onYouTubeIframeAPIReady(){new YT.Player('player',{videoId:${JSON.stringify(videoId)},width:'100%',height:'100%',playerVars:{playsinline:1,rel:0,origin:${JSON.stringify(origin)}},events:{onReady:function(){window.ReactNativeWebView.postMessage('ready')},onError:function(){window.ReactNativeWebView.postMessage('error')}}})}</script></body></html>`;
  return (
    <WebView
      source={{ html, baseUrl: origin }}
      originWhitelist={["https://*"]}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction
      onError={onError}
      onHttpError={onError}
      onMessage={(event) => {
        if (event.nativeEvent.data === "error") onError();
        if (event.nativeEvent.data === "ready") onReady();
      }}
      style={{ flex: 1, backgroundColor: "#000" }}
    />
  );
}
