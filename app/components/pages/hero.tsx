import { Link } from '@remix-run/react'

export default function Hero() {
  return (
    <section id="hero">
      <div>
        <div>
          <div>
            <ul>
              <li>
                <div>
                  <h1>Conheça a <span>Thermal</span>. 🔥 Aquecimento de qualidade para seu lar
                  </h1>

                  <h3>Oferecemos as melhores soluções de aquecimento no mercado, atuando a mais de 5 anos em todo Rio Grande do Sul. Não espere mais para desfrutar do conforto que merece - entre em contato conosco hoje mesmo.</h3>
                </div>
              </li>

              <li>
                <div>
                  <h1>Somos uma empresa dedicada em oferecer as melhores soluções de aquecimento disponíveis no mercado.</h1>

                  <h3>Para nós, o cliente é prioridade. Conheça nossos projetos e solicite um orçamento personalizado abaixo.</h3>
                </div>
              </li>

              <li>
                <div>
                  <h1>Veja mais sobre <Link to="/services" title="services"><span>nossos serviços</span></Link> ou solicite um <Link to="/contact" title="contact us"><span>orçamento</span></Link>.</h1>

                  <h3>Explore as soluções de aquecimento que temos disponíveis para você. Estaremos prontos para ajudá-lo a encontrar a melhor solução para suas necessidades.</h3>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div id="more">
        <Link to="/services">Saiba mais<i className="fas fa-angle-down"></i></Link>
      </div>
    </section>
  );
}
