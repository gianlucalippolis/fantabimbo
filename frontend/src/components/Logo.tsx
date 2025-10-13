import Image from "next/image";
import logo from "../../public/logo.png";

export const Logo = () => {
  return (
    <div>
      <Image
        src={logo}
        alt="Fantanome"
        priority
        width={200}
        height={200}
        style={{ height: 120, width: "auto" }}
      />
    </div>
  );
};
