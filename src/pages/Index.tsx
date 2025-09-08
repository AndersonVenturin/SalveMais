import { useEffect } from "react";
import LoginForm from "@/components/LoginForm";

const Index = () => {
  useEffect(() => {
    document.title = "Salve+ - Entre na sua conta";
  }, []);

  return <LoginForm />;
};

export default Index;
