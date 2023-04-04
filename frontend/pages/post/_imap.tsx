import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import { useContext, useEffect, useState } from "react";
import { LatLng } from "leaflet";
import "leaflet-defaulticon-compatibility";
import { onMapClickContext } from ".";

function ClickEvent() {
  const [position, setPosition] = useState<LatLng | null>(null);
  const mapClick = useContext(onMapClickContext);

  const map = useMapEvents({
    click: (e) => {
      // map.setView(e.latlng, 15);
      mapClick(e);
      setPosition(e.latlng);
    },
  });
  return position === null ? null : <Marker position={position}></Marker>;
}

export default function IMap() {
  return (
    <MapContainer
      center={[51.505, -0.09]}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution={`&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`}
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickEvent />
    </MapContainer>
  );
}
