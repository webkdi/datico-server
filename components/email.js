const nodemailer = require("nodemailer");

// Create a transporter object using SMTP details
const transporter = nodemailer.createTransport({
  host: "mail.polk.uno",
  port: 465,
  secure: true, // Set to true if using TLS
  auth: {
    user: "info@polk.uno",
    pass: "lY9sI0kW7t",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

async function sendMail(sendFromEmail) {
  // Email content
  const mailOptions = {
    from: sendFromEmail, // Sender address
    to: "info@mail.polk.uno", // List of recipients
    subject: "Email for update of addresses", // Subject line
    text: "Это техническая рассылка для адресов емейлов", // Plain text body
    // html: '<b>Hello world?</b>', // You can use HTML content instead of plain text
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error occurred:", error.message);
    } else {
      console.log("Email sent successfully:", info.response);
    }
  });
}

async function sendMailAddressesToSaleBot() {
  const emailsText = `
abrikos73@gmail.com
abrikos73@rambler.ru
alesya.spb.88@gmail.com
alexeycheko@gmail.com
almeirano@gmail.com
alonettahell2018@gmail.com
andrewhite0987@gmail.com
antonia.bolek@gmx.at
ashurov.s@fisar.co.at
basem.sadek@yahoo.de
bittkin@yahoo.de
buschra@yandex.ru
camomile_st@mail.ru
charlotte.rombach@chello.at
davydova.m.n@gmail.com
dimitri.korenev@gmail.com
dimitry.dementev@gmail.com
dmitry-dem@rambler.ru
dmn.ananik@gmail.com
dok.romanov@gmail.com
donner.80b@gmail.com
eduard.hochweis@yandex.com
E-fro@yandex.ru
elena.frolova@chello.at
elena.hochwarter@gmail.com
elena@degano.info
elenasokolova569@mail.ru
elina.petrovska1972@gmail.com
eliseykorot@yandex.com
ellina1602@gmail.com
emart28@rambler.ru
evguenia@gmx.at
faina.chulis@gmail.com
flash-olia@mail.ru
fraudoc007@gmail.com
gromovanv@gmail.com
h.messner@mail.ru
hachapurri@list.ru
Helena.x@libero.it
hetbumer@gmail.com
hubert.jobst@aon.at
i.fuersatz@aon.at
ihaider@gmx.net
ina.holzmann.0506@gmail.com
info@freud.online
info@polk.uno
infos.oko@gmx.at
intolkacheva@yandex.ru
ipb09@yahoo.com
irina.gottlib@hotmail.com
irina.turanski@gmail.com
irina_solon@yahoo.com
itbyurlo@gmail.com
ivtan69@mail.ru
juhoo@gmx.net
julia.hitl@gmx.at
jul-se@yandex.ru
kamolaaa@gmail.com
klimchukf@gmail.com
klimova376@gmail.com
kschmidt75@gmx.de
kseniya.porokhnova@gmail.com
kutaistojas@gmail.com
l.v.k@gmx.at
larissa.holzinger@gmx.at
lawnmower333@gmail.com
leckaja.irina@gmail.com
lenirodax@yahoo.com
lev@ibatullin.com
liza-art@mail.ru
m.pauser@gmx.at
mag.larisa2012@mail.ru
maria@level76.at
marina.mlacker@gmail.com
marina75@gmx.at
marinasonvilla@gmail.com
matroskin@gmx.at
mold164wien@yahoo.com
muelermichael95@gmx.ch
Muellermichael95@gmx.ch
multikids2013@gmail.com
musatova09@mail.ru
n.malinovskaya55@gmail.com
Nadezhda.mikolasek@gmail.com
nargizasabirovaa@gmail.com
nata.karl52@gmail.com
natalia.scharaeva@chello.at
natalia.slyusareva888@gmail.com
nataliabrunner77@gmail.com
natallia.niachai@gmail.com
natalminru@gmail.com
o.lavrova.wien@gmail.com
ogk@mail.ru
ogoni66@mail.ru
olga.buturlina@gmx.at
olga.rebikova@gmail.com
poceidon21@gmail.com
pristauer@yahoo.de
risesea@yandex.ru
rkabajew@gmail.com
s.kalaba@mail.ru
s.kormout@gmail.com
sara.korol@mail.ru
sdelika@gmail.com
siperevalov@mail.ru
skoerbler@yahoo.de
skorpi1011@gmail.com
solofelt.lidiya@gmail.com
stadnat7@gmail.com
svetlanaweihs@gmail.com
sviatlanasubbotina@gmail.com
t.mochar@gmx.at
tamyfriend@yandex.ru
tatiana@bals.im
tatka201075@yandex.ru
tatwlad@gmail.com
tatyana-knyazeva@mail.ru
timurcik25@inbox.lv
v.yelfimov@gmail.com
vasic.gordana22@aon.at
vechkanovaekaterina9@gmail.com
vikaher@yahoo.de
Viktoria.herkel@yahoo.de
vyakunin@rambler.ru
yegorov60@gmail.com
zatic.svetlana@gmail.com
zhizhimontova@mail.ru
zhizhimontova05011995@gmail.com
zinaidatribis@gmail.com
оl.kol@gmx.at
`;
  const emailsArray = emailsText.split("\n");

  for await (const email of emailsArray.slice(0, 905)) {
    const sentMail = await sendMail(email);
    console.log(sentMail);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
// sendMailAddressesToSaleBot();
