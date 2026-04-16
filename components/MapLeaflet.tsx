// ─────────────────────────────────────────────
// MapLeaflet — Carte OpenStreetMap via WebView
//
// Remplace react-native-maps (Google Maps) qui
// crashait sur Android sans clé API.
// Utilise Leaflet.js + tuiles OpenStreetMap.
// Aucune clé API requise.
// ─────────────────────────────────────────────

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Coordinate, Zone } from '../types';

export interface MapLeafletRef {
  centerOn: (lat: number, lng: number) => void;
  updateLocation: (lat: number, lng: number) => void;
}

interface Props {
  zones: Zone[];
  traceCoords: Coordinate[];
}

// HTML complet avec Leaflet embarqué via CDN
const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body,html{width:100%;height:100%;background:#0D0D0D}
#map{width:100%;height:100%}
.zt{background:rgba(0,0,0,.82)!important;color:#F5F5F5!important;border:none!important;font-size:10px!important;font-weight:700!important;padding:2px 6px!important;border-radius:4px!important;box-shadow:none!important;white-space:nowrap!important}
.zt::before{display:none!important}
.leaflet-tooltip-own{border:none!important;box-shadow:none!important}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([-12.355,49.3],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

var dot=null,line=null,zones={};

function recv(d){
  if(!d||!d.t)return;
  if(d.t==='c'){
    map.setView([d.lat,d.lng],17,{animate:true,duration:0.5});
  }
  if(d.t==='l'){
    if(dot)map.removeLayer(dot);
    dot=L.circleMarker([d.lat,d.lng],{
      radius:9,fillColor:'#4285F4',color:'#fff',weight:2,fillOpacity:1
    }).addTo(map);
    map.panTo([d.lat,d.lng],{animate:true,duration:0.3});
  }
  if(d.t==='tr'){
    if(line)map.removeLayer(line);
    if(d.p&&d.p.length>1){
      line=L.polyline(d.p,{color:'#FF4136',weight:3,opacity:0.9}).addTo(map);
    }
  }
  if(d.t==='z'){
    Object.keys(zones).forEach(function(k){map.removeLayer(zones[k]);});
    zones={};
    (d.list||[]).forEach(function(z){
      var coords=z.coordinates.map(function(c){return[c.latitude,c.longitude];});
      var poly=L.polygon(coords,{
        fillColor:z.ownerColor,fillOpacity:0.35,
        color:z.ownerColor,weight:2,opacity:0.9
      }).addTo(map);
      poly.bindTooltip(z.ownerName,{
        permanent:true,direction:'center',className:'zt'
      });
      zones[z.id]=poly;
    });
  }
}

function onMsg(e){
  try{recv(JSON.parse(e.data));}catch(err){}
}
window.addEventListener('message',onMsg);
document.addEventListener('message',onMsg);
</script>
</body>
</html>`;

const MapLeaflet = forwardRef<MapLeafletRef, Props>(({ zones, traceCoords }, ref) => {
  const wv = useRef<WebView>(null);

  function send(obj: object) {
    wv.current?.injectJavaScript(
      `try{recv(${JSON.stringify(obj)});}catch(e){}true;`,
    );
  }

  useImperativeHandle(ref, () => ({
    centerOn:       (lat, lng) => send({ t: 'c', lat, lng }),
    updateLocation: (lat, lng) => send({ t: 'l', lat, lng }),
  }));

  useEffect(() => {
    send({ t: 'z', list: zones });
  }, [zones]);

  useEffect(() => {
    const p = traceCoords.map((c) => [c.latitude, c.longitude]);
    send({ t: 'tr', p });
  }, [traceCoords]);

  return (
    <WebView
      ref={wv}
      source={{ html: MAP_HTML }}
      style={StyleSheet.absoluteFillObject}
      scrollEnabled={false}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
      mixedContentMode="always"
      startInLoadingState={false}
    />
  );
});

MapLeaflet.displayName = 'MapLeaflet';
export default MapLeaflet;
