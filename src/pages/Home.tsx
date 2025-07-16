import { DualTimer } from '../components/DualTimer';
import '../styles/home.css';

export default function Home() {
  return (
    <div className="main-content">
      <div className="container">
        <h1>Bem-vindo ao Alongaí!</h1>
        <p>Um lembrete saudável para alternar entre atividades no computador e alongamentos</p>
        <DualTimer />
        <div className="health-tips">
          <h3>Dicas para uma rotina mais saudável:</h3>
          <ul>
            <li>Ajuste sua postura a cada 20 minutos</li>
            <li>Mantenha os pés apoiados no chão</li>
            <li>Posicione sua tela na altura dos olhos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
