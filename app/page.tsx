import { CadastroTeacolhe } from "./components/CadastroTeacolhe";
import {
  listarPacientes,
  listarTerapeutas,
  listarEspecialidades,
  listarHorarios,
  contarPacientes,
} from "./actions";

export default async function Home() {
  const [pacientes, terapeutas, especialidades, horarios, stats] = await Promise.all([
    listarPacientes(),
    listarTerapeutas(),
    listarEspecialidades(),
    listarHorarios(),
    contarPacientes(),
  ]);

  return (
    <CadastroTeacolhe
      initialPacientes={pacientes}
      initialTerapeutas={terapeutas}
      initialEspecialidades={especialidades}
      initialHorarios={horarios}
      initialStats={stats}
    />
  );
}
