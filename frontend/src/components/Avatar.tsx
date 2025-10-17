import styles from "./Avatar.module.css";

interface AvatarProps {
  imageUrl?: string | null;
  name: string;
  size?: "small" | "medium" | "large";
  className?: string;
}

export default function Avatar({
  imageUrl,
  name,
  size = "medium",
  className = "",
}: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`${styles.avatar} ${styles[size]} ${className}`}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name} className={styles.image} />
      ) : (
        <div className={styles.placeholder}>{initials}</div>
      )}
    </div>
  );
}
