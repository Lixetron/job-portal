import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  makeStyles,
} from "@material-ui/core";
import { useHistory } from "react-router-dom";

import isAuth, { userType } from "../lib/isAuth";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
}));

const Navbar = (props) => {
  const classes = useStyles();
  let history = useHistory();

  const handleClick = (location) => {
    console.log(location);
    history.push(location);
  };

  return (
    <AppBar position="fixed">
      <Toolbar>
        <Typography variant="h6" className={classes.title}>
          Job Portal
        </Typography>
        {isAuth() ? (
          userType() === "recruiter" ? (
            <>
              <Button color="inherit" onClick={() => handleClick("/home")}>
                Главная
              </Button>
              <Button color="inherit" onClick={() => handleClick("/addjob")}>
                Добавить вакансию
              </Button>
              <Button color="inherit" onClick={() => handleClick("/myjobs")}>
                Мои вакансии
              </Button>
              <Button color="inherit" onClick={() => handleClick("/employees")}>
                Работники
              </Button>
              <Button color="inherit" onClick={() => handleClick("/profile")}>
                Профиль
              </Button>
              <Button color="inherit" onClick={() => handleClick("/logout")}>
                Выйти
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" onClick={() => handleClick("/home")}>
                Главная
              </Button>
              <Button
                color="inherit"
                onClick={() => handleClick("/applications")}
              >
                Заявки
              </Button>
              <Button color="inherit" onClick={() => handleClick("/profile")}>
                Профиль
              </Button>
              <Button color="inherit" onClick={() => handleClick("/logout")}>
                Выйти
              </Button>
            </>
          )
        ) : (
          <>
            <Button color="inherit" onClick={() => handleClick("/login")}>
              Войти
            </Button>
            <Button color="inherit" onClick={() => handleClick("/signup")}>
              Регистрация
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
