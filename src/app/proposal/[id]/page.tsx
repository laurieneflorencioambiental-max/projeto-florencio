'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import type { ProposalData, Plan, Exam } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import '../../globals.css';


function ProposalPageContent({ proposalData }: { proposalData: ProposalData }) {
    const { lead, proposalState, fullProposalNumber } = proposalData;
    
    const formatCurrency = (value: number) => {
        if (!value) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value);
    };
    
    const serviceAreas = [
        { label: 'Saúde e Segurança do Trabalho' },
        { label: 'Meio Ambiente' },
        { label: 'eSocial SST' },
        { label: 'Auditorias e Inspeções' },
    ];


  return (
    <main className="bg-gray-100 dark:bg-gray-900 p-4 sm:p-8 flex justify-center min-h-screen">
        <div className="a4-page p-8 text-sm bg-white shadow-lg" style={{ color: '#596371' }}>
        {/* Header */}
        <header className="flex justify-between items-center pb-4 border-b">
        <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1b7689' }}>Grupo Florencio</h1>
            <p className="text-sm">Saúde Ocupacional Estratégica</p>
            <p className="text-xs">CNPJ: 35.041.385/0001-10</p>
        </div>
        <div className="text-right">
            <h2 className="text-xl font-semibold">Proposta Comercial</h2>
            <p className="text-sm">{fullProposalNumber}</p>
            <p className="text-sm">Data: {new Date(proposalData.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>
        </header>

        {/* Client info */}
        <section className="my-8">
            <h3 className="text-lg font-semibold mb-2 border-b pb-2">Para:</h3>
            <p className="font-bold">{lead.company}</p>
            <p>
                A/C: {lead.name}
                {lead.role && `, ${lead.role}`}
            </p>
            <p>CNPJ: {lead.cnpj}</p>
            <p>Email: {lead.email}</p>
            <p>WhatsApp: {lead.whatsapp}</p>
        </section>

        <div className="border-b my-8"></div>

        {/* About us */}
        <section className="my-8">
            <h3 className="text-lg font-semibold mb-2">Sobre nós</h3>
            <p className="text-sm leading-relaxed mt-4">
            Somos apaixonados há mais de uma década por transformar ambientes de trabalho. O Grupo Florêncio se consolidou como referência em Saúde e Segurança do Trabalho. Nossa equipe, especializada e eficiente, atua com cuidado e comprometimento para criar espaços corporativos mais seguros, sustentáveis e alinhados às Normas Regulamentadoras. Com transparência e expertise, proporcionamos a confiança que sua empresa precisa para elevar seus padrões de segurança e eficiência. Confie em nossa experiência para alcançar resultados valiosos e duradouros.
            </p>
            <blockquote className="border-l-4 pl-4 py-2 my-4" style={{ borderColor: '#1b7689' }}>
            <p className="text-sm italic">
                "Nossos serviços são investimentos, onde trazemos benefícios que superam qualquer custo, pois não é sobre preço, é sobre entregar resultados valiosos. Comprometemo-nos integralmente a proporcionar excelência em Saúde e Segurança do Trabalho, impulsionados pela nossa especialização e dedicação incansável.”
            </p>
            <footer className="text-right text-xs font-medium mt-2">
                Grupo Florêncio
            </footer>
            </blockquote>
            <div className='my-8'>
            <div className="grid md:grid-cols-3 gap-8">
                <div>
                <h4 className="font-bold text-lg" style={{ color: '#1b7689' }}>Missão</h4>
                <p className="text-sm leading-relaxed mt-2">
                    Nossa missão é disponibilizar serviços da Qualidade, Saúde, Meio Ambiente & Segurança do Trabalho em prol do uso adequado dos recursos naturais, aumento da produtividade e bem-estar social, superando as expectativas de nossos clientes e agregando valores para a sociedade.
                </p>
                </div>
                <div>
                <h4 className="font-bold text-lg" style={{ color: '#1b7689' }}>Visão</h4>
                <p className="text-sm leading-relaxed mt-2">
                    Sermos reconhecidos pela excelência dos nossos serviços, de forma a garantir qualidade, satisfação do cliente exercendo papel estratégico na execução de todos os trabalhos prestados.
                </p>
                </div>
                <div>
                <h4 className="font-bold text-lg" style={{ color: '#1b7689' }}>Valores</h4>
                <p className="text-sm leading-relaxed mt-2">
                    Dedicação aos nossos clientes, Honestidade, Ética, Transparência, Comprometimento Socio ambiental.
                </p>
                </div>
            </div>
            </div>
             <h4 className="text-md font-semibold text-center mt-6">
                Temos uma equipe especializada para oferecer as melhores soluções em:
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center my-6">
            {serviceAreas.map((area, index) => (
                <div key={index} className="flex flex-col items-center justify-center p-4 bg-primary/10 rounded-lg h-full">
                <span className="font-semibold text-sm text-center" style={{ color: '#1b7689' }}>{area.label}</span>
                </div>
            ))}
            </div>
            <div className="border-b"></div>

            <h3 className="text-lg font-semibold mt-6">Objetivo</h3>
            <p className="text-sm leading-relaxed mt-4">
            Temos por objetivo o compromisso em oferecer serviços de Saúde Ocupacional e Segurança do Trabalho com excelência e em conformidade com a legislação, promovendo ambientes corporativos seguros, saudáveis e produtivos.
            </p>
            <div className="border-b my-6"></div>
            <p className="text-sm leading-relaxed">
            Esta Proposta Comercial está com valores compatíveis de Negociação para o atendimento da Prestação de Serviços de QSMS - Qualidade, Segurança, Meio Ambiente e Saúde. Gostaríamos de salientar o grande interesse que temos em trabalhar em parceria com a sua empresa, pois a nossa missão é oferecer serviços em gestão através de uma visão estratégica buscando a satisfação do cliente e melhorias para a  sociedade.
            </p>
            <p className="text-sm leading-relaxed mt-4">
            Para tal, encaminhamos ao V. Sr. (a)., a presente Proposta de Preços para a realização dos serviços conforme descritos, de acordo com as diretrizes técnicas, para esta conceituada empresa.
            </p>
        </section>

        {/* Dynamic content sections */}
        <section className="my-8 space-y-6">
            <h3 className="text-lg font-semibold mb-2 border-b pb-2">Objeto da Proposta</h3>
            <div className="prose dark:prose-invert max-w-none p-2" dangerouslySetInnerHTML={{ __html: proposalState.proposalObject.replace(/\n/g, '<br />') }} />

            <h3 className="text-lg font-semibold mb-2 border-b pb-2">Escopo do Serviço</h3>
            <div className="prose dark:prose-invert max-w-none p-2" dangerouslySetInnerHTML={{ __html: proposalState.serviceScope.replace(/\n/g, '<br />') }} />
            
            <h3 className="text-lg font-semibold mb-2 border-b pb-2">Da Contratante</h3>
            <div className="prose dark:prose-invert max-w-none p-2" dangerouslySetInnerHTML={{ __html: proposalState.clientResponsibilities.replace(/\n/g, '<br />') }} />

            <h3 className="text-lg font-semibold mb-2 border-b pb-2">Da Contratada</h3>
            <div className="prose dark:prose-invert max-w-none p-2" dangerouslySetInnerHTML={{ __html: proposalState.contractorResponsibilities.replace(/\n/g, '<br />') }} />

            <h3 className="text-lg font-semibold mb-2 border-b pb-2">Prazo para Realização dos Serviços</h3>
            <div className="prose dark:prose-invert max-w-none p-2" dangerouslySetInnerHTML={{ __html: proposalState.deadline.replace(/\n/g, '<br />') }} />

            <h3 className="text-lg font-semibold mb-2 border-b pb-2">Nossa Visão Estratégica</h3>
            <div className="prose dark:prose-invert max-w-none p-2" dangerouslySetInnerHTML={{ __html: proposalState.strategicVision.replace(/\n/g, '<br />') }} />
        </section>
        
        {/* Investment */}
        <section className="my-8">
            <h3 className="text-lg font-semibold mb-2 border-b pb-2">Investimento</h3>
            {lead.value > 0 && <div className="prose dark:prose-invert max-w-none p-2" dangerouslySetInnerHTML={{ __html: proposalState.investment }} />}
            
            {proposalState.plans && proposalState.plans.length > 0 && (
            <div className="mt-4">
                <p className="text-sm mb-4">Abaixo seguem as opções dos Planos, de acordo com a estratégia financeira da sua empresa.</p>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr style={{ backgroundColor: '#1b7689' }} className="text-white">
                                <th className="p-3 text-left font-semibold">Planos</th>
                                <th className="p-3 text-left font-semibold">Faixa de Funcionários</th>
                                <th className="p-3 text-left font-semibold">Serviços Inclusos</th>
                                <th className="p-3 text-left font-semibold">Investimento</th>
                                <th className="p-3 text-center font-semibold">PG Único</th>
                                <th className="p-3 text-center font-semibold">PG Mensal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {proposalState.plans.map((plan: Plan, index: number) => (
                                <tr key={plan.id} className={cn("border-b", index % 2 === 0 ? "bg-blue-50" : "bg-blue-100")} style={{ borderColor: 'rgba(27, 118, 137, 0.2)' }}>
                                    <td className="p-3 align-top">{plan.name}</td>
                                    <td className="p-3 align-top">{plan.employeeRange}</td>
                                    <td className="p-3 align-top whitespace-pre-wrap">{plan.servicesIncluded}</td>
                                    <td className="p-3 align-top">{formatCurrency(plan.investment)}</td>
                                    <td className="p-3 text-center align-top">{plan.paymentType === 'unique' ? 'X' : ''}</td>
                                    <td className="p-3 text-center align-top">{plan.paymentType === 'monthly' ? 'X' : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}
            {proposalState.exams && proposalState.exams.length > 0 && (
              <div className="mt-8">
                <p className="text-sm mb-4">Abaixo seguem os valores de exames complementares (se aplicável).</p>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr style={{ backgroundColor: '#1b7689' }} className="text-white">
                                <th className="p-3 text-left font-semibold">Serviço</th>
                                <th className="p-3 text-left font-semibold">Descrição</th>
                                <th className="p-3 text-left font-semibold">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {proposalState.exams.map((exam: Exam, index: number) => (
                                <tr key={exam.id} className={cn("border-b", index % 2 === 0 ? "bg-blue-50" : "bg-blue-100")} style={{ borderColor: 'rgba(27, 118, 137, 0.2)' }}>
                                    <td className="p-3 align-top">{exam.service}</td>
                                    <td className="p-3 align-top">{exam.description}</td>
                                    <td className="p-3 align-top">{formatCurrency(exam.value)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </div>
            )}
        </section>

        {/* Condições de Pagamento */}
        <section className="my-8">
            <h3 className="text-lg font-semibold mb-2 border-b pb-2">
                Condições de Pagamento
            </h3>
            <ul className="list-disc list-inside space-y-2">
                {lead.paymentMethods.map((pm, index) => (
                    <li key={index}>
                    {pm.method.replace(/\s\(.*\)/, '')}
                    </li>
                ))}
            </ul>
        </section>

        <div className="border-b my-8"></div>


        {/* Termo de Aprovação */}
        <section className="my-8" style={{ breakBefore: 'page' }}>
            <h3 className="text-lg font-semibold mb-4">
                Termo de aprovação:
            </h3>

            <div className="p-4 rounded-lg border" style={{ backgroundColor: 'rgba(27, 118, 137, 0.1)', borderColor: 'rgba(27, 118, 137, 0.2)' }}>
                <h4 className="font-bold text-center mb-2" style={{ color: '#1b7689' }}>Aprovação do Serviço</h4>
                <p className="text-center text-xs">
                    Esta Proposta Técnica Comercial será APROVADA, mediante a sua devolução via e-mail, assinada e datada por pessoa responsável da CONTRATANTE.
                </p>
            </div>

            <div className="mt-8 space-y-6">
                <p>De acordo em: ______ / ______ / ______</p>
                <p>Nome do Aprovador: ____________________________________________________</p>
            </div>

            <div className="mt-8 border rounded-lg p-4 space-y-4">
                <p className='font-semibold'>Prezado cliente,</p>
                <p>
                    Em nossa busca contínua em promover práticas de Segurança do Trabalho e Sustentabilidade, gostaríamos de propor uma parceria em nossas mídias sociais. Caso tenhamos a honra de realizar este projeto com a sua empresa, gostaríamos de saber se podemos divulgar nosso trabalho realizado nas suas instalações em nossas plataformas digitais, como Instagram, Linkedin, Site, YouTube?
                </p>
                <p>
                    Acreditamos que essa parceria poderá beneficiar a imagem positiva da sua empresa no compromisso com a Segurança do Trabalho e Meio Ambiente.
                </p>
                <div className="space-y-2 mt-4">
                    <p>(  ) sim</p>
                    <p>(  ) não</p>
                </div>
            </div>
        </section>


        {/* Footer */}
        <footer className="text-center pt-8 border-t mt-8">
            <p className="font-bold" style={{ color: '#1b7689' }}>Grupo Florencio</p>
            <p className="text-xs">comercial@grupoflorencio.com.br | +55 (21) 96453-9493 | @grupoflorencio</p>
            <p className="text-xs">www.grupoflorencio.com.br</p>
        </footer>
        </div>
    </main>
  );
}

export default function ProposalViewerPage() {
    const params = useParams();
    const firestore = useFirestore();
    const [proposalData, setProposalData] = useState<ProposalData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const id = params.id as string;

    useEffect(() => {
        if (!firestore || !id) {
            setIsLoading(false);
            if (!id) setError("ID da proposta não encontrado.");
            if (!firestore) setError("Serviço de banco de dados não disponível.");
            return;
        };
        
        const fetchProposal = async () => {
            setIsLoading(true);
            try {
                const proposalRef = doc(firestore, 'proposals', id);
                const docSnap = await getDoc(proposalRef);

                if (docSnap.exists()) {
                    setProposalData(docSnap.data() as ProposalData);
                } else {
                    setError('Proposta não encontrada.');
                }
            } catch (err) {
                console.error("Error fetching proposal:", err);
                setError('Ocorreu um erro ao carregar a proposta.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProposal();
    }, [firestore, id]);

    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <div className="flex h-screen w-full items-center justify-center text-destructive bg-background">{error}</div>;
    }

    if (!proposalData) {
        return <div className="flex h-screen w-full items-center justify-center bg-background">Nenhuma proposta para exibir.</div>;
    }

    return <ProposalPageContent proposalData={proposalData} />;
}
