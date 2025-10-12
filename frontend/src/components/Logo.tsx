import Image from "next/image";
import logo from "../../public/logo.png";

export const Logo = () => {
  return (
    <div>
      <Image
        src={logo}
        alt="Fantabimbo"
        priority
        style={{ height: 120, width: "auto" }}
      />
    </div>
  );
};
