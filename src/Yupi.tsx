import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

// 1. Definimos el esquema de validación con Yup
const schema = yup.object({
  nombre: yup.string().required("El nombre es obligatorio"),
  edad: yup.number()
    .typeError("Debe ser un número")
    .positive("Debe ser mayor a 0")
    .integer()
    .required(),
  password: yup.string().min(6, "Mínimo 6 caracteres").required()
}).required();

// 2. Extraemos el tipo automáticamente del esquema
//type FormData = yup.InferType<typeof schema>;

interface FormData{
    nombre: string;
    edad: number;
    password: string;
}

export default function FormularioYup() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(schema) // 3. Conectamos Yup con RHF
  });

  const onSubmit = (data: FormData) => console.log(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("nombre")} placeholder="Nombre" />
      <p>{errors.nombre?.message}</p>

      <input type="number" {...register("edad")} placeholder="Edad" />
      <p>{errors.edad?.message}</p>

      <input type="password" {...register("password")} placeholder="Password" />
      <p>{errors.password?.message}</p>

      <button type="submit">Enviar</button>
    </form>
  );
}
