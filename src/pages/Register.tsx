import { useEffect } from "react";
import RegisterForm from "@/components/RegisterForm";

const Register = () => {
  useEffect(() => {
    document.title = "Salve+ - Cadastre-se";
  }, []);

  return <RegisterForm />;
};

export default Register;