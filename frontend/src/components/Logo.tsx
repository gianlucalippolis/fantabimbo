import Image from "next/image";
import logo from "../../public/logo.png";

export const Logo = () => {
  return (
    <div>
      <Image
        src={logo}
        alt="Fantabimbo"
        priority
        style={{ height: 200, width: "auto" }}
      />
    </div>
  );
};
