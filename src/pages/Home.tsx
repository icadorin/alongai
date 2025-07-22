import { DualTimer } from '../components/DualTimer.tsx';
import '../styles/home.css';
import '../styles/dual-timer.css';

export default function Home() {
  return (
    <div className="main-content">
      <div className="container">
        <h1>Bem-vindo ao Alongaí!</h1>
        <p>Um lembrete saudável para alternar entre atividades no computador e alongamentos</p>
        <DualTimer />
        <div className="health-tips">
          <h4>Dicas de postura:</h4>
          <ul className="tips-list">
            <li>Ajuste a postura a cada 20 min</li>
            <li>Pés bem apoiados no chão</li>
            <li>Tela na altura dos olhos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
