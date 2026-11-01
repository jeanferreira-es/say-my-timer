import Svg, { Circle, Path, Rect } from "react-native-svg";

// Same artwork as assets/images/icon.svg, without the background,
// cropped to a square around the stopwatch.
export function AppIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="157 170 710 710">
      <Rect x={484} y={226} width={56} height={70} fill="#FFFFFF" />
      <Rect x={437} y={170} width={150} height={64} rx={32} fill="#FFFFFF" />
      <Rect
        x={732}
        y={304}
        width={84}
        height={48}
        rx={24}
        fill="#DE2C6E"
        transform="rotate(45 774 328)"
      />
      <Circle cx={512} cy={580} r={300} fill="#FFFFFF" />
      <Circle cx={512} cy={580} r={246} fill="#011521" />
      <Circle
        cx={512}
        cy={580}
        r={200}
        fill="none"
        stroke="#03AAB6"
        strokeWidth={42}
      />
      <Path
        d="M512 380 A200 200 0 0 1 685.2 680"
        fill="none"
        stroke="#DE2C6E"
        strokeWidth={42}
        strokeLinecap="round"
      />
      <Path
        d="M466 520 C466 485 488 468 514 468 C552 468 578 490 578 524 C578 560 552 578 516 580 L516 600 L470 600 L468 548 C510 548 530 544 530 526 C530 514 522 508 512 508 C500 508 492 514 492 528 Z"
        fill="#FFFFFF"
      />
      <Rect x={462} y={616} width={64} height={56} rx={28} fill="#FFFFFF" />
    </Svg>
  );
}
