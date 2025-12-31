// Temporary type declarations for react-leaflet until packages are installed
// This file should be removed after running: npm install react-leaflet leaflet

declare module 'react-leaflet' {
  import { ComponentType, ReactNode } from 'react';
  
  export interface MapContainerProps {
    center: [number, number];
    zoom: number;
    style?: React.CSSProperties;
    children?: ReactNode;
    [key: string]: any;
  }
  
  export interface TileLayerProps {
    url: string;
    attribution?: string;
    [key: string]: any;
  }
  
  export interface MarkerProps {
    position: [number, number];
    children?: ReactNode;
    [key: string]: any;
  }
  
  export interface PopupProps {
    children?: ReactNode;
    [key: string]: any;
  }
  
  export interface CircleMarkerProps {
    center: [number, number];
    radius?: number;
    pathOptions?: {
      color?: string;
      fillColor?: string;
      fillOpacity?: number;
      weight?: number;
      [key: string]: any;
    };
    eventHandlers?: {
      [key: string]: (...args: any[]) => void;
    };
    children?: ReactNode;
    [key: string]: any;
  }
  
  export interface PolylineProps {
    positions: [number, number][];
    color?: string;
    weight?: number;
    opacity?: number;
    [key: string]: any;
  }
  
  export const MapContainer: ComponentType<MapContainerProps>;
  export const TileLayer: ComponentType<TileLayerProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const Popup: ComponentType<PopupProps>;
  export const CircleMarker: ComponentType<CircleMarkerProps>;
  export const Polyline: ComponentType<PolylineProps>;
}

