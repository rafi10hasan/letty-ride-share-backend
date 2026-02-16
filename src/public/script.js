// document.getElementById("audioCallBtn").addEventListener("click", async () => {
//   const userID = "689d8c40e0115e59dfdf9a9a";
//   const userName = document.getElementById("username").value || userID;
//   const peerID = document.getElementById("peerId").value || "peer";
//   const roomID = `room_${[userID, peerID].sort().join("_")}`;

//   const res = await fetch(`/token/${userID}?roomId=${roomID}`);
//   const { kitToken, appID } = await res.json();

//   console.log("kitToken:", kitToken, typeof kitToken);

//   if (!kitToken || typeof kitToken !== "string") {
//     console.error("Invalid kitToken received from backend!");
//     return;
//   }

//   const zp = ZegoUIKitPrebuilt.create({
//     appID: Number(appID),
//     token: String(kitToken),
//     userID,
//     userName,
//     roomID
//   });

//   zp.joinRoom({
//     container: document.getElementById("call_container"),
//     scenario: "AudioCall",
//     turnOnCameraWhenJoining: false,
//     showMyCameraToggleButton: false,
//     showAudioVideoSettingsButton: false,
//     showScreenSharingButton: false
//   });

//   console.log(`Joined 1-to-1 audio call: ${roomID}`);
// });
