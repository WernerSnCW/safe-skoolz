interface VoiceShieldLogoProps {
  size?: number;
  className?: string;
}

export function VoiceShieldLogo({ size = 40, className = "" }: VoiceShieldLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M32 4C32 4 8 12 8 28C8 44 20 56 32 60C44 56 56 44 56 28C56 12 32 4 32 4Z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M32 4C32 4 8 12 8 28C8 44 20 56 32 60C44 56 56 44 56 28C56 12 32 4 32 4Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 25C18 23.3 19.3 22 21 22H25V38H21C19.3 38 18 36.7 18 35V25Z"
        fill="currentColor"
        opacity="0.8"
      />
      <path d="M25 20L38 13V47L25 40V20Z" fill="currentColor" opacity="0.8" />
      <path d="M42 19C46 23 48 27 48 30.5C48 34 46 38 42 42" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.6" />
      <path d="M42 26C43.8 28 44.5 29.5 44.5 30.5C44.5 31.5 43.8 33 42 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

export function VoiceShieldIcon({ size = 24, className = "" }: VoiceShieldLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M32 4C32 4 8 12 8 28C8 44 20 56 32 60C44 56 56 44 56 28C56 12 32 4 32 4Z"
        fill="#0D9488"
      />
      <path
        d="M18 25C18 23.3 19.3 22 21 22H25V38H21C19.3 38 18 36.7 18 35V25Z"
        fill="white"
      />
      <path d="M25 20L38 13V47L25 40V20Z" fill="white" />
      <path d="M42 19C46 23 48 27 48 30.5C48 34 46 38 42 42" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
      <path d="M42 26C43.8 28 44.5 29.5 44.5 30.5C44.5 31.5 43.8 33 42 35" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}
