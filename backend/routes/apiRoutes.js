import express from 'express';
import mongoose from 'mongoose';
import jwtAuth from '../lib/jwtAuth.js';
import User from '../db/User.js';
import JobApplicant from '../db/JobApplicant.js';
import Recruiter from '../db/Recruiter.js';
import Job from '../db/Job.js';
import Application from '../db/Application.js';
import Rating from '../db/Rating.js';

const router = express.Router();

// To add new job
router.post('/jobs', jwtAuth, (req, res) => {
    const user = req.user;

    if (user.type !== 'recruiter') {
        res.status(401).json({
            message: 'У Вас нет прав для создания вакансий',
        });
        return;
    }

    const data = req.body;

    let job = new Job({
        userId: user._id,
        title: data.title,
        maxApplicants: data.maxApplicants,
        maxPositions: data.maxPositions,
        dateOfPosting: data.dateOfPosting,
        deadline: data.deadline,
        skillsets: data.skillsets,
        jobType: data.jobType,
        duration: data.duration,
        salary: data.salary,
        rating: data.rating,
    });

    job
        .save()
        .then(() => {
            res.json({
                message: 'Вакансия успешно добавлена в базу данных',
            });
        })
        .catch((err) => {
            res.status(400)
                .json(err);
        });
});

// to get all the jobs [pagination] [for recruiter personal and for everyone]
router.get('/jobs', jwtAuth, (req, res) => {
    let user = req.user;
    let findParams = {};
    let sortParams = {};

    // const page = parseInt(req.query.page) ? parseInt(req.query.page) : 1;
    // const limit = parseInt(req.query.limit) ? parseInt(req.query.limit) : 10;
    // const skip = page - 1 >= 0 ? (page - 1) * limit : 0;

    // to list down jobs posted by a particular recruiter
    if (user.type === 'recruiter' && req?.query?.myjobs) {
        findParams = {
            ...findParams,
            userId: user._id,
        };
    }

    if (req?.query?.q) {
        findParams = {
            ...findParams,
            title: {
                $regex: new RegExp(req.query.q, 'i'),
            },
        };
    }

    if (req?.query?.jobType) {
        let jobTypes = [];

        if (Array.isArray(req.query.jobType)) {
            jobTypes = req.query.jobType;
        } else {
            jobTypes = [req.query.jobType];
        }

        console.log(jobTypes);

        findParams = {
            ...findParams,
            jobType: {
                $in: jobTypes,
            },
        };
    }

    if (req?.query?.salaryMin && req?.query?.salaryMax) {
        findParams = {
            ...findParams,
            $and: [
                {
                    salary: {
                        $gte: parseInt(req.query.salaryMin),
                    },
                },
                {
                    salary: {
                        $lte: parseInt(req.query.salaryMax),
                    },
                },
            ],
        };
    } else if (req?.query?.salaryMin) {
        findParams = {
            ...findParams,
            salary: {
                $gte: parseInt(req.query.salaryMin),
            },
        };
    } else if (req?.query?.salaryMax) {
        findParams = {
            ...findParams,
            salary: {
                $lte: parseInt(req.query.salaryMax),
            },
        };
    }

    if (req?.query?.duration) {
        findParams = {
            ...findParams,
            duration: {
                $lt: parseInt(req.query.duration),
            },
        };
    }

    if (req?.query?.asc) {
        if (Array.isArray(req.query.asc)) {
            req.query.asc.map((key) => {
                sortParams = {
                    ...sortParams,
                    [key]: 1,
                };
            });
        } else {
            sortParams = {
                ...sortParams,
                [req.query.asc]: 1,
            };
        }
    }

    if (req?.query?.desc) {
        if (Array.isArray(req.query.desc)) {
            req.query.desc.map((key) => {
                sortParams = {
                    ...sortParams,
                    [key]: -1,
                };
            });
        } else {
            sortParams = {
                ...sortParams,
                [req.query.desc]: -1,
            };
        }
    }

    console.log(findParams);
    console.log(sortParams);

    // Job.find(findParams).collation({ locale: "en" }).sort(sortParams);
    // .skip(skip)
    // .limit(limit)

    let arr = [
        {
            $lookup: {
                from: 'recruiterinfos',
                localField: 'userId',
                foreignField: 'userId',
                as: 'recruiter',
            },
        },
        {$unwind: '$recruiter'},
        {$match: findParams},
    ];

    if (Object.keys(sortParams).length) {
        arr = [
            {
                $lookup: {
                    from: 'recruiterinfos',
                    localField: 'userId',
                    foreignField: 'userId',
                    as: 'recruiter',
                },
            },
            {$unwind: '$recruiter'},
            {$match: findParams},
            {
                $sort: sortParams,
            },
        ];
    }

    console.log(arr);

    Job.aggregate(arr)
        .then((posts) => {
            if (posts == null) {
                res.status(404).json({
                    message: 'Вакансии не найдены',
                });

                return;
            }

            res.json(posts);
        })
        .catch((err) => {
            res.status(400).json(err);
        });
});

// to get info about a particular job
router.get('/jobs/:id', jwtAuth, (req, res) => {
    Job.findOne({_id: req.params.id})
        .then((job) => {
            if (job == null) {
                res.status(400).json({
                    message: 'Вакансия не существует',
                });

                return;
            }

            res.json(job);
        })
        .catch((err) => {
            res.status(400)
                .json(err);
        });
});

// to update info of a particular job
router.put('/jobs/:id', jwtAuth, (req, res) => {
    const user = req.user;

    if (user.type !== 'recruiter') {
        res.status(401).json({
            message: 'У Вас нет прав на изменение данных вакансии',
        });

        return;
    }
    Job.findOne({
        _id: req.params.id,
        userId: user.id,
    })
        .then((job) => {
            const data = req.body;

            if (job == null) {
                res.status(404).json({
                    message: 'Вакансия не существует',
                });

                return;
            }

            if (data?.maxApplicants) {
                job.maxApplicants = data.maxApplicants;
            }

            if (data?.maxPositions) {
                job.maxPositions = data.maxPositions;
            }

            if (data?.deadline) {
                job.deadline = data.deadline;
            }

            job
                .save()
                .then(() => {
                    res.json({
                        message: 'Данные вакансии успешно обновлены',
                    });
                })
                .catch((err) => {
                    res.status(400)
                        .json(err);
                });
        })
        .catch((err) => {
            res.status(400).json(err);
        });
});

// to delete a job
router.delete('/jobs/:id', jwtAuth, (req, res) => {
    const user = req.user;

    if (user.type !== 'recruiter') {
        res.status(401).json({
            message: 'У Вас недостаточно прав для удаления ваканси',
        });

        return;
    }
    Job.findOneAndDelete({
        _id: req.params.id,
        userId: user.id,
    })
        .then((job) => {
            if (job == null) {
                res.status(401)
                    .json({
                        message: 'У Вас недостаточно прав для удаления ваканси',
                    });

                return;
            }

            res.json({
                message: 'Вакансия успешно удалена',
            });
        })
        .catch((err) => {
            res.status(400)
                .json(err);
        });
});

// get user's personal details
router.get('/user', jwtAuth, (req, res) => {
    const user = req.user;

    if (user.type === 'recruiter') {
        Recruiter.findOne({userId: user._id})
            .then((recruiter) => {
                if (recruiter == null) {
                    res.status(404).json({
                        message: 'Пользователь не существует',
                    });
                    return;
                }
                res.json(recruiter);
            })
            .catch((err) => {
                res.status(400).json(err);
            });
    } else {
        JobApplicant
            .findOne({
                userId: user._id,
            })
            .then((jobApplicant) => {
                if (jobApplicant == null) {
                    res.status(404)
                        .json({
                            message: 'Пользователь не существует',
                        });

                    return;
                }

                res.json(jobApplicant);
            })
            .catch((err) => {
                res.status(400)
                    .json(err);
            });
    }
});

// get user details from id
router.get('/user/:id', jwtAuth, (req, res) => {
    User
        .findOne({
            _id: req.params.id,
        })
        .then((userData) => {
            if (userData === null) {
                res.status(404)
                    .json({
                        message: 'Пользователь не существует',
                    });

                return;
            }

            if (userData.type === 'recruiter') {
                Recruiter
                    .findOne({
                        userId: userData._id,
                    })
                    .then((recruiter) => {
                        if (recruiter == null) {
                            res.status(404)
                                .json({
                                    message: 'Пользователь не существует',
                                });

                            return;
                        }
                        res.json(recruiter);
                    })
                    .catch((err) => {
                        res.status(400).json(err);
                    });
            } else {
                JobApplicant
                    .findOne({
                        userId: userData._id,
                    })
                    .then((jobApplicant) => {
                        if (jobApplicant == null) {
                            res.status(404)
                                .json({
                                    message: 'Пользователь не существует',
                                });

                            return;
                        }

                        res.json(jobApplicant);
                    })
                    .catch((err) => {
                        res.status(400)
                            .json(err);
                    });
            }
        })
        .catch((err) => {
            res.status(400).json(err);
        });
});

// update user details
router.put('/user', jwtAuth, (req, res) => {
    const user = req.user;
    const data = req.body;
    if (user.type == 'recruiter') {
        Recruiter.findOne({userId: user._id})
            .then((recruiter) => {
                if (recruiter == null) {
                    res.status(404).json({
                        message: 'Пользователь не существует',
                    });
                    return;
                }
                if (data.name) {
                    recruiter.name = data.name;
                }
                if (data.contactNumber) {
                    recruiter.contactNumber = data.contactNumber;
                }
                if (data.bio) {
                    recruiter.bio = data.bio;
                }
                recruiter
                    .save()
                    .then(() => {
                        res.json({
                            message: 'Информация о пользователе успешно обновлена',
                        });
                    })
                    .catch((err) => {
                        res.status(400).json(err);
                    });
            })
            .catch((err) => {
                res.status(400).json(err);
            });
    } else {
        JobApplicant.findOne({userId: user._id})
            .then((jobApplicant) => {
                if (jobApplicant == null) {
                    res.status(404).json({
                        message: 'Пользователь не существует',
                    });
                    return;
                }
                if (data.name) {
                    jobApplicant.name = data.name;
                }
                if (data.education) {
                    jobApplicant.education = data.education;
                }
                if (data.skills) {
                    jobApplicant.skills = data.skills;
                }
                if (data.resume) {
                    jobApplicant.resume = data.resume;
                }
                if (data.profile) {
                    jobApplicant.profile = data.profile;
                }
                console.log(jobApplicant);
                jobApplicant
                    .save()
                    .then(() => {
                        res.json({
                            message: 'Информация о пользователе успешно обновлена',
                        });
                    })
                    .catch((err) => {
                        res.status(400).json(err);
                    });
            })
            .catch((err) => {
                res.status(400).json(err);
            });
    }
});

// apply for a job [todo: test: done]
router.post('/jobs/:id/applications', jwtAuth, (req, res) => {
    const user = req.user;
    if (user.type != 'applicant') {
        res.status(401).json({
            message: 'У Вас нет прав на одобрения на вакансию',
        });
        return;
    }
    const data = req.body;
    const jobId = req.params.id;

    // check whether applied previously
    // find job
    // check count of active applications < limit
    // check user had < 10 active applications && check if user is not having any accepted jobs (user id)
    // store the data in applications

    Application.findOne({
        userId: user._id,
        jobId: jobId,
        status: {
            $nin: ['deleted', 'accepted', 'cancelled'],
        },
    })
        .then((appliedApplication) => {
            console.log(appliedApplication);
            if (appliedApplication !== null) {
                res.status(400).json({
                    message: 'Вы уже были приняты на эту вакансию',
                });
                return;
            }

            Job.findOne({_id: jobId})
                .then((job) => {
                    if (job === null) {
                        res.status(404).json({
                            message: 'Вакансия не существует',
                        });
                        return;
                    }
                    Application.countDocuments({
                        jobId: jobId,
                        status: {
                            $nin: ['rejected', 'deleted', 'cancelled', 'finished'],
                        },
                    })
                        .then((activeApplicationCount) => {
                            if (activeApplicationCount < job.maxApplicants) {
                                Application.countDocuments({
                                    userId: user._id,
                                    status: {
                                        $nin: ['rejected', 'deleted', 'cancelled', 'finished'],
                                    },
                                })
                                    .then((myActiveApplicationCount) => {
                                        if (myActiveApplicationCount < 10) {
                                            Application.countDocuments({
                                                userId: user._id,
                                                status: 'accepted',
                                            }).then((acceptedJobs) => {
                                                if (acceptedJobs === 0) {
                                                    const application = new Application({
                                                        userId: user._id,
                                                        recruiterId: job.userId,
                                                        jobId: job._id,
                                                        status: 'applied',
                                                        sop: data.sop,
                                                    });
                                                    application
                                                        .save()
                                                        .then(() => {
                                                            res.json({
                                                                message: 'Заявка на вакансию успешно отправлена',
                                                            });
                                                        })
                                                        .catch((err) => {
                                                            res.status(400).json(err);
                                                        });
                                                } else {
                                                    res.status(400).json({
                                                        message:
                                                            'У Вас уже есть одобренная вакансия, поэтому вы не можете принять.',
                                                    });
                                                }
                                            });
                                        } else {
                                            res.status(400).json({
                                                message:
                                                    'У Вас есть 10 активных заявок, поэтому вы не можете принять.',
                                            });
                                        }
                                    })
                                    .catch((err) => {
                                        res.status(400).json(err);
                                    });
                            } else {
                                res.status(400).json({
                                    message: 'Достигнут лимит заявок',
                                });
                            }
                        })
                        .catch((err) => {
                            res.status(400).json(err);
                        });
                })
                .catch((err) => {
                    res.status(400).json(err);
                });
        })
        .catch((err) => {
            res.json(400).json(err);
        });
});

// recruiter gets applications for a particular job [pagination] [todo: test: done]
router.get('/jobs/:id/applications', jwtAuth, (req, res) => {
    const user = req.user;
    if (user.type != 'recruiter') {
        res.status(401).json({
            message: 'У Вас нет прав на просмотр заявок на вакансию',
        });
        return;
    }
    const jobId = req.params.id;

    // const page = parseInt(req.query.page) ? parseInt(req.query.page) : 1;
    // const limit = parseInt(req.query.limit) ? parseInt(req.query.limit) : 10;
    // const skip = page - 1 >= 0 ? (page - 1) * limit : 0;

    let findParams = {
        jobId: jobId,
        recruiterId: user._id,
    };

    let sortParams = {};

    if (req.query.status) {
        findParams = {
            ...findParams,
            status: req.query.status,
        };
    }

    Application.find(findParams)
        .collation({locale: 'en'})
        .sort(sortParams)
        // .skip(skip)
        // .limit(limit)
        .then((applications) => {
            res.json(applications);
        })
        .catch((err) => {
            res.status(400).json(err);
        });
});

// recruiter/applicant gets all his applications [pagination]
router.get('/applications', jwtAuth, (req, res) => {
    const user = req.user;

    // const page = parseInt(req.query.page) ? parseInt(req.query.page) : 1;
    // const limit = parseInt(req.query.limit) ? parseInt(req.query.limit) : 10;
    // const skip = page - 1 >= 0 ? (page - 1) * limit : 0;

    Application.aggregate([
        {
            $lookup: {
                from: 'jobapplicantinfos',
                localField: 'userId',
                foreignField: 'userId',
                as: 'jobApplicant',
            },
        },
        {$unwind: '$jobApplicant'},
        {
            $lookup: {
                from: 'jobs',
                localField: 'jobId',
                foreignField: '_id',
                as: 'job',
            },
        },
        {$unwind: '$job'},
        {
            $lookup: {
                from: 'recruiterinfos',
                localField: 'recruiterId',
                foreignField: 'userId',
                as: 'recruiter',
            },
        },
        {$unwind: '$recruiter'},
        {
            $match: {
                [user.type === 'recruiter' ? 'recruiterId' : 'userId']: user._id,
            },
        },
        {
            $sort: {
                dateOfApplication: -1,
            },
        },
    ])
        .then((applications) => {
            res.json(applications);
        })
        .catch((err) => {
            res.status(400).json(err);
        });
});

// update status of application: [Applicant: Can cancel, Recruiter: Can do everything] [todo: test: done]
router.put('/applications/:id', jwtAuth, (req, res) => {
    const user = req.user;
    const id = req.params.id;
    const status = req.body.status;
    const statusRu = {
        applied: "одобрена",
        shortlisted: "отобрана",
        accepted: "принята",
        rejected: "отклонена",
        deleted: "удалена",
        cancelled: "отменена",
        finished: "завершена",
    };

    // "applied", // when a applicant is applied
    // "shortlisted", // when a applicant is shortlisted
    // "accepted", // when a applicant is accepted
    // "rejected", // when a applicant is rejected
    // "deleted", // when any job is deleted
    // "cancelled", // an application is cancelled by its author or when other application is accepted
    // "finished", // when job is over

    if (user.type === 'recruiter') {
        if (status === 'accepted') {
            // get job id from application
            // get job info for maxPositions count
            // count applications that are already accepted
            // compare and if condition is satisfied, then save

            Application.findOne({
                _id: id,
                recruiterId: user._id,
            })
                .then((application) => {
                    if (application === null) {
                        res.status(404).json({
                            message: 'Заявка не найдена',
                        });
                        return;
                    }

                    Job.findOne({
                        _id: application.jobId,
                        userId: user._id,
                    }).then((job) => {
                        if (job === null) {
                            res.status(404).json({
                                message: 'Вакансия не существует',
                            });
                            return;
                        }

                        Application.countDocuments({
                            recruiterId: user._id,
                            jobId: job._id,
                            status: 'accepted',
                        }).then((activeApplicationCount) => {
                            if (activeApplicationCount < job.maxPositions) {
                                // accepted
                                application.status = status;
                                application.dateOfJoining = req.body.dateOfJoining;
                                application
                                    .save()
                                    .then(() => {
                                        Application.updateMany(
                                            {
                                                _id: {
                                                    $ne: application._id,
                                                },
                                                userId: application.userId,
                                                status: {
                                                    $nin: [
                                                        'rejected',
                                                        'deleted',
                                                        'cancelled',
                                                        'accepted',
                                                        'finished',
                                                    ],
                                                },
                                            },
                                            {
                                                $set: {
                                                    status: 'cancelled',
                                                },
                                            },
                                            {multi: true},
                                        )
                                            .then(() => {
                                                if (status === 'accepted') {
                                                    Job.findOneAndUpdate(
                                                        {
                                                            _id: job._id,
                                                            userId: user._id,
                                                        },
                                                        {
                                                            $set: {
                                                                acceptedCandidates: activeApplicationCount + 1,
                                                            },
                                                        },
                                                    )
                                                        .then(() => {
                                                            res.json({
                                                                message: `Заявка успешно ${statusRu[status]}`,
                                                            });
                                                        })
                                                        .catch((err) => {
                                                            res.status(400).json(err);
                                                        });
                                                } else {
                                                    res.json({
                                                        message: `Заявка успешно ${statusRu[status]}`,
                                                    });
                                                }
                                            })
                                            .catch((err) => {
                                                res.status(400).json(err);
                                            });
                                    })
                                    .catch((err) => {
                                        res.status(400).json(err);
                                    });
                            } else {
                                res.status(400).json({
                                    message: 'Все позиции на эту вакансию уже заполнены',
                                });
                            }
                        });
                    });
                })
                .catch((err) => {
                    res.status(400).json(err);
                });
        } else {
            Application.findOneAndUpdate(
                {
                    _id: id,
                    recruiterId: user._id,
                    status: {
                        $nin: ['rejected', 'deleted', 'cancelled'],
                    },
                },
                {
                    $set: {
                        status: status,
                    },
                },
            )
                .then((application) => {
                    if (application === null) {
                        res.status(400).json({
                            message: 'Статус заявки не может быть обновлен',
                        });
                        return;
                    }
                    if (status === 'finished') {
                        res.json({
                            message: `Вакансия успешно ${statusRu[status]}`,
                        });
                    } else {
                        res.json({
                            message: `Заявка успешно ${statusRu[status]}`,
                        });
                    }
                })
                .catch((err) => {
                    res.status(400).json(err);
                });
        }
    } else {
        if (status === 'cancelled') {
            console.log(id);
            console.log(user._id);
            Application.findOneAndUpdate(
                {
                    _id: id,
                    userId: user._id,
                },
                {
                    $set: {
                        status: status,
                    },
                },
            )
                .then((tmp) => {
                    console.log(tmp);
                    res.json({
                        message: `Заявка успешно ${statusRu[status]}`,
                    });
                })
                .catch((err) => {
                    res.status(400).json(err);
                });
        } else {
            res.status(401).json({
                message: 'У Вас недостаточно прав для обновления статуса вакансии',
            });
        }
    }
});

// get a list of final applicants for current job : recruiter
// get a list of final applicants for all his jobs : recuiter
router.get('/applicants', jwtAuth, (req, res) => {
    const user = req.user;
    if (user.type === 'recruiter') {
        let findParams = {
            recruiterId: user._id,
        };
        if (req.query.jobId) {
            findParams = {
                ...findParams,
                jobId: new mongoose.Types.ObjectId(req.query.jobId),
            };
        }
        if (req.query.status) {
            if (Array.isArray(req.query.status)) {
                findParams = {
                    ...findParams,
                    status: {$in: req.query.status},
                };
            } else {
                findParams = {
                    ...findParams,
                    status: req.query.status,
                };
            }
        }
        let sortParams = {};

        if (!req.query.asc && !req.query.desc) {
            sortParams = {_id: 1};
        }

        if (req.query.asc) {
            if (Array.isArray(req.query.asc)) {
                req.query.asc.map((key) => {
                    sortParams = {
                        ...sortParams,
                        [key]: 1,
                    };
                });
            } else {
                sortParams = {
                    ...sortParams,
                    [req.query.asc]: 1,
                };
            }
        }

        if (req.query.desc) {
            if (Array.isArray(req.query.desc)) {
                req.query.desc.map((key) => {
                    sortParams = {
                        ...sortParams,
                        [key]: -1,
                    };
                });
            } else {
                sortParams = {
                    ...sortParams,
                    [req.query.desc]: -1,
                };
            }
        }

        Application.aggregate([
            {
                $lookup: {
                    from: 'jobapplicantinfos',
                    localField: 'userId',
                    foreignField: 'userId',
                    as: 'jobApplicant',
                },
            },
            {$unwind: '$jobApplicant'},
            {
                $lookup: {
                    from: 'jobs',
                    localField: 'jobId',
                    foreignField: '_id',
                    as: 'job',
                },
            },
            {$unwind: '$job'},
            {$match: findParams},
            {$sort: sortParams},
        ])
            .then((applications) => {
                if (applications.length === 0) {
                    res.status(404).json({
                        message: 'Заявок не найдено',
                    });
                    return;
                }
                res.json(applications);
            })
            .catch((err) => {
                res.status(400).json(err);
            });
    } else {
        res.status(400).json({
            message: 'У Вас нет разрешения до списка заявок',
        });
    }
});

// to add or update a rating [todo: test]
router.put('/rating', jwtAuth, (req, res) => {
    const user = req.user;
    const data = req.body;
    if (user.type === 'recruiter') {
        // can rate applicant
        Rating.findOne({
            senderId: user._id,
            receiverId: data.applicantId,
            category: 'applicant',
        })
            .then((rating) => {
                if (rating === null) {
                    console.log('new rating');
                    Application.countDocuments({
                        userId: data.applicantId,
                        recruiterId: user._id,
                        status: {
                            $in: ['accepted', 'finished'],
                        },
                    })
                        .then((acceptedApplicant) => {
                            if (acceptedApplicant > 0) {
                                // add a new rating

                                rating = new Rating({
                                    category: 'applicant',
                                    receiverId: data.applicantId,
                                    senderId: user._id,
                                    rating: data.rating,
                                });

                                rating
                                    .save()
                                    .then(() => {
                                        // get the average of ratings
                                        Rating.aggregate([
                                            {
                                                $match: {
                                                    receiverId: mongoose.Types.ObjectId(data.applicantId),
                                                    category: 'applicant',
                                                },
                                            },
                                            {
                                                $group: {
                                                    _id: {},
                                                    average: {$avg: '$rating'},
                                                },
                                            },
                                        ])
                                            .then((result) => {
                                                // update the user's rating
                                                if (result === null) {
                                                    res.status(400).json({
                                                        message: 'Ошибка при расчете оценки',
                                                    });
                                                    return;
                                                }
                                                const avg = result[0].average;

                                                JobApplicant.findOneAndUpdate(
                                                    {
                                                        userId: data.applicantId,
                                                    },
                                                    {
                                                        $set: {
                                                            rating: avg,
                                                        },
                                                    },
                                                )
                                                    .then((applicant) => {
                                                        if (applicant === null) {
                                                            res.status(400).json({
                                                                message:
                                                                    'Ошибка при расчете средней оценки работника',
                                                            });
                                                            return;
                                                        }
                                                        res.json({
                                                            message: 'Оценка успешно добавлена',
                                                        });
                                                    })
                                                    .catch((err) => {
                                                        res.status(400).json(err);
                                                    });
                                            })
                                            .catch((err) => {
                                                res.status(400).json(err);
                                            });
                                    })
                                    .catch((err) => {
                                        res.status(400).json(err);
                                    });
                            } else {
                                // you cannot rate
                                res.status(400).json({
                                    message:
                                        'Работник не работает на Вас, поэтому вы не можете его оценить.',
                                });
                            }
                        })
                        .catch((err) => {
                            res.status(400).json(err);
                        });
                } else {
                    rating.rating = data.rating;
                    rating
                        .save()
                        .then(() => {
                            // get the average of ratings
                            Rating.aggregate([
                                {
                                    $match: {
                                        receiverId: mongoose.Types.ObjectId(data.applicantId),
                                        category: 'applicant',
                                    },
                                },
                                {
                                    $group: {
                                        _id: {},
                                        average: {$avg: '$rating'},
                                    },
                                },
                            ])
                                .then((result) => {
                                    // update the user's rating
                                    if (result === null) {
                                        res.status(400).json({
                                            message: 'Ошибка при расчете оценки',
                                        });
                                        return;
                                    }
                                    const avg = result[0].average;
                                    JobApplicant.findOneAndUpdate(
                                        {
                                            userId: data.applicantId,
                                        },
                                        {
                                            $set: {
                                                rating: avg,
                                            },
                                        },
                                    )
                                        .then((applicant) => {
                                            if (applicant === null) {
                                                res.status(400).json({
                                                    message:
                                                        'Ошибка при обновлении средней оценки вакансии',
                                                });
                                                return;
                                            }
                                            res.json({
                                                message: 'Оценка успешно обновлена',
                                            });
                                        })
                                        .catch((err) => {
                                            res.status(400).json(err);
                                        });
                                })
                                .catch((err) => {
                                    res.status(400).json(err);
                                });
                        })
                        .catch((err) => {
                            res.status(400).json(err);
                        });
                }
            })
            .catch((err) => {
                res.status(400).json(err);
            });
    } else {
        // applicant can rate job
        Rating.findOne({
            senderId: user._id,
            receiverId: data.jobId,
            category: 'job',
        })
            .then((rating) => {
                console.log(user._id);
                console.log(data.jobId);
                console.log(rating);
                if (rating === null) {
                    console.log(rating);
                    Application.countDocuments({
                        userId: user._id,
                        jobId: data.jobId,
                        status: {
                            $in: ['accepted', 'finished'],
                        },
                    })
                        .then((acceptedApplicant) => {
                            if (acceptedApplicant > 0) {
                                // add a new rating

                                rating = new Rating({
                                    category: 'job',
                                    receiverId: data.jobId,
                                    senderId: user._id,
                                    rating: data.rating,
                                });

                                rating
                                    .save()
                                    .then(() => {
                                        // get the average of ratings
                                        Rating.aggregate([
                                            {
                                                $match: {
                                                    receiverId: mongoose.Types.ObjectId(data.jobId),
                                                    category: 'job',
                                                },
                                            },
                                            {
                                                $group: {
                                                    _id: {},
                                                    average: {$avg: '$rating'},
                                                },
                                            },
                                        ])
                                            .then((result) => {
                                                if (result === null) {
                                                    res.status(400).json({
                                                        message: 'Ошибка при расчете оценки',
                                                    });
                                                    return;
                                                }
                                                const avg = result[0].average;
                                                Job.findOneAndUpdate(
                                                    {
                                                        _id: data.jobId,
                                                    },
                                                    {
                                                        $set: {
                                                            rating: avg,
                                                        },
                                                    },
                                                )
                                                    .then((foundJob) => {
                                                        if (foundJob === null) {
                                                            res.status(400).json({
                                                                message:
                                                                    'Ошибка при обновлении средней оценки вакансии',
                                                            });
                                                            return;
                                                        }
                                                        res.json({
                                                            message: 'Оценка успешно добавлена',
                                                        });
                                                    })
                                                    .catch((err) => {
                                                        res.status(400).json(err);
                                                    });
                                            })
                                            .catch((err) => {
                                                res.status(400).json(err);
                                            });
                                    })
                                    .catch((err) => {
                                        res.status(400).json(err);
                                    });
                            } else {
                                // you cannot rate
                                res.status(400).json({
                                    message:
                                        'Вас не одобряли на эту вакансию, поэтому не можете оценивать.',
                                });
                            }
                        })
                        .catch((err) => {
                            res.status(400).json(err);
                        });
                } else {
                    // update the rating
                    rating.rating = data.rating;
                    rating
                        .save()
                        .then(() => {
                            // get the average of ratings
                            Rating.aggregate([
                                {
                                    $match: {
                                        receiverId: mongoose.Types.ObjectId(data.jobId),
                                        category: 'job',
                                    },
                                },
                                {
                                    $group: {
                                        _id: {},
                                        average: {$avg: '$rating'},
                                    },
                                },
                            ])
                                .then((result) => {
                                    if (result === null) {
                                        res.status(400).json({
                                            message: 'Ошибка при расчете оценки',
                                        });
                                        return;
                                    }
                                    const avg = result[0].average;
                                    console.log(avg);

                                    Job.findOneAndUpdate(
                                        {
                                            _id: data.jobId,
                                        },
                                        {
                                            $set: {
                                                rating: avg,
                                            },
                                        },
                                    )
                                        .then((foundJob) => {
                                            if (foundJob === null) {
                                                res.status(400).json({
                                                    message: 'Ошибка при обновлении средней оценки вакансии',
                                                });
                                                return;
                                            }
                                            res.json({
                                                message: 'Оценка успешно добавлена',
                                            });
                                        })
                                        .catch((err) => {
                                            res.status(400).json(err);
                                        });
                                })
                                .catch((err) => {
                                    res.status(400).json(err);
                                });
                        })
                        .catch((err) => {
                            res.status(400).json(err);
                        });
                }
            })
            .catch((err) => {
                res.status(400).json(err);
            });
    }
});

// get personal rating
router.get('/rating', jwtAuth, (req, res) => {
    const user = req.user;
    Rating.findOne({
        senderId: user._id,
        receiverId: req.query.id,
        category: user.type === 'recruiter' ? 'applicant' : 'job',
    }).then((rating) => {
        if (rating === null) {
            res.json({
                rating: -1,
            });
            return;
        }
        res.json({
            rating: rating.rating,
        });
    });
});

// Application.findOne({
//   _id: id,
//   userId: user._id,
// })
//   .then((application) => {
//     application.status = status;
//     application
//       .save()
//       .then(() => {
//         res.json({
//           message: `Application ${status} successfully`,
//         });
//       })
//       .catch((err) => {
//         res.status(400).json(err);
//       });
//   })
//   .catch((err) => {
//     res.status(400).json(err);
//   });

// router.get("/jobs", (req, res, next) => {
//   passport.authenticate("jwt", { session: false }, function (err, user, info) {
//     if (err) {
//       return next(err);
//     }
//     if (!user) {
//       res.status(401).json(info);
//       return;
//     }
//   })(req, res, next);
// });

export default router;
